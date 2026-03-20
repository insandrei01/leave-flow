"use client";

/**
 * Auth store — module-level singleton state for authentication.
 *
 * Note: Zustand is not installed in this project. This module provides a
 * Zustand-compatible interface (create / selector pattern) using a simple
 * React-friendly subscriber model backed by sessionStorage persistence.
 *
 * Shape:
 *   user        — Firebase User object (null when logged out)
 *   employee    — LeaveFlow Employee record (null when not loaded)
 *   isLoading   — true while auth operations are in progress
 *   isAuthenticated — true when user is non-null
 *
 * Usage:
 *   const isAuthenticated = useAuthStore(s => s.isAuthenticated);
 *   const { login } = useAuthStore(s => s);
 */

import { useState, useEffect, useCallback } from "react";
import {
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { apiClient } from "@/lib/api-client";
import type { Employee } from "@leaveflow/shared-types";

/* =========================================================================
   Types
   ========================================================================= */

export interface RegisterData {
  readonly companyName: string;
  readonly adminName: string;
  readonly adminEmail: string;
  readonly password: string;
}

interface RegisterResponseData {
  readonly tenantId: string;
  readonly employeeId: string;
  readonly firebaseUid: string;
}

export interface AuthState {
  readonly user: FirebaseUser | null;
  readonly employee: Employee | null;
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
}

export interface AuthActions {
  readonly login: (email: string, password: string) => Promise<void>;
  readonly register: (data: RegisterData) => Promise<void>;
  readonly logout: () => Promise<void>;
  readonly setUser: (user: FirebaseUser | null) => void;
  readonly setEmployee: (employee: Employee | null) => void;
  readonly setLoading: (isLoading: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

/* =========================================================================
   Session persistence helpers
   ========================================================================= */

const SESSION_KEY = "leaveflow-auth";

interface PersistedAuth {
  readonly employee: Employee | null;
  readonly isAuthenticated: boolean;
}

function loadPersistedAuth(): PersistedAuth {
  if (typeof window === "undefined") {
    return { employee: null, isAuthenticated: false };
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { employee: null, isAuthenticated: false };
    return JSON.parse(raw) as PersistedAuth;
  } catch {
    return { employee: null, isAuthenticated: false };
  }
}

function savePersistedAuth(state: PersistedAuth): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function clearPersistedAuth(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore storage errors
  }
}

/* =========================================================================
   Module-level state (singleton)
   ========================================================================= */

const persisted = loadPersistedAuth();

let _state: AuthState = {
  user: null,
  employee: persisted.employee,
  isLoading: true,
  isAuthenticated: persisted.isAuthenticated,
};

type Listener = () => void;
const _listeners = new Set<Listener>();

function getState(): AuthState {
  return _state;
}

function setState(partial: Partial<AuthState>): void {
  _state = { ..._state, ...partial };

  // Persist serializable fields
  savePersistedAuth({
    employee: _state.employee,
    isAuthenticated: _state.isAuthenticated,
  });

  // Notify all subscribers
  _listeners.forEach((fn) => fn());
}

function subscribe(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/* =========================================================================
   Actions
   ========================================================================= */

async function login(email: string, password: string): Promise<void> {
  setState({ isLoading: true });
  try {
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      email,
      password
    );
    const firebaseUser = credential.user;

    const result = await apiClient.get<Employee>("/employees/me");
    const employee = result.success ? result.data : null;

    setState({
      user: firebaseUser,
      employee,
      isAuthenticated: true,
      isLoading: false,
    });
  } catch (error) {
    setState({ isLoading: false });
    throw error;
  }
}

async function register(data: RegisterData): Promise<void> {
  setState({ isLoading: true });
  try {
    const result = await apiClient.post<RegisterResponseData>(
      "/auth/register",
      data,
      { skipAuth: true }
    );

    if (!result.success) {
      throw new Error(result.error ?? "Registration failed");
    }

    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      data.adminEmail,
      data.password
    );

    setState({
      user: credential.user,
      employee: null,
      isAuthenticated: true,
      isLoading: false,
    });
  } catch (error) {
    setState({ isLoading: false });
    throw error;
  }
}

async function logout(): Promise<void> {
  setState({ isLoading: true });
  try {
    await signOut(firebaseAuth);
    clearPersistedAuth();
    setState({
      user: null,
      employee: null,
      isAuthenticated: false,
      isLoading: false,
    });
  } catch (error) {
    setState({ isLoading: false });
    throw error;
  }
}

function setUser(user: FirebaseUser | null): void {
  if (_state.user?.uid === user?.uid) return;
  setState({ user, isAuthenticated: user !== null });
}

function setEmployee(employee: Employee | null): void {
  setState({ employee });
}

function setLoading(isLoading: boolean): void {
  setState({ isLoading });
}

/* =========================================================================
   useAuthStore hook — Zustand-compatible selector API
   ========================================================================= */

/**
 * Subscribe to auth store state with a selector.
 *
 * @example
 * const isAuthenticated = useAuthStore(s => s.isAuthenticated);
 * const login = useAuthStore(s => s.login);
 */
export function useAuthStore<T>(selector: (state: AuthStore) => T): T {
  const store: AuthStore = {
    ...getState(),
    login,
    register,
    logout,
    setUser,
    setEmployee,
    setLoading,
  };

  // Force re-render when store updates
  const [, forceRender] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribe(() => forceRender((n) => n + 1));
    return unsubscribe;
  }, []);

  return selector(store);
}

/**
 * Get the full store object outside of React (for non-hook contexts).
 * Does NOT subscribe to updates.
 */
export function getAuthStore(): AuthStore {
  return {
    ...getState(),
    login,
    register,
    logout,
    setUser,
    setEmployee,
    setLoading,
  };
}

/* =========================================================================
   Direct action exports (for use outside hooks)
   ========================================================================= */

export { login as authLogin, logout as authLogout, setUser, setEmployee, setLoading };
