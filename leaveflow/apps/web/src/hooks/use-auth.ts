"use client";

/**
 * useAuth hook — subscribes to Firebase onAuthStateChanged and keeps the
 * Zustand auth store in sync.
 *
 * Mount this hook once at the app shell level. All other components should
 * read state from useAuthStore() directly.
 *
 * Returns the current auth state for convenience.
 */

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { useAuthStore } from "@/stores/auth.store";
import { apiClient } from "@/lib/api-client";
import type { Employee } from "@leaveflow/shared-types";

/* =========================================================================
   Hook
   ========================================================================= */

export function useAuth() {
  const { user, employee, isLoading, isAuthenticated, setUser, setEmployee, setLoading, login, register, logout } =
    useAuthStore();

  useEffect(() => {
    // Set loading while Firebase resolves the initial auth state
    setLoading(true);

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser && !employee) {
        // Fetch the employee profile whenever we have a Firebase user but
        // no employee record in store (e.g., page refresh)
        try {
          const result = await apiClient.get<Employee>("/employees/me");
          setEmployee(result.success ? result.data : null);
        } catch {
          setEmployee(null);
        }
      } else if (!firebaseUser) {
        setEmployee(null);
      }

      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    user,
    employee,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };
}
