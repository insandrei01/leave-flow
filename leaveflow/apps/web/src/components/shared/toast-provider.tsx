"use client";

/**
 * ToastProvider — toast notifications built without external dependencies.
 *
 * Usage:
 *   1. Wrap app (or layout) with <ToastProvider />
 *   2. Call the useToast() hook anywhere to fire toasts
 *
 * Types: success, error, warning, info
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  readonly id: string;
  readonly type: ToastType;
  readonly title: string;
  readonly description?: string;
  readonly durationMs?: number;
}

interface ToastContextValue {
  readonly toast: (options: Omit<Toast, "id">) => void;
  readonly dismiss: (id: string) => void;
}

/* =========================================================================
   Context
   ========================================================================= */

const ToastContext = createContext<ToastContextValue | null>(null);

/* =========================================================================
   Config
   ========================================================================= */

const TYPE_CONFIG: Record<ToastType, { icon: ReactNode; classes: string }> = {
  success: {
    classes: "border-accent-emerald/30 bg-accent-emerald/10",
    icon: (
      <svg className="h-4 w-4 text-accent-emerald" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    classes: "border-accent-rose/30 bg-accent-rose/10",
    icon: (
      <svg className="h-4 w-4 text-accent-rose" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  warning: {
    classes: "border-accent-amber/30 bg-accent-amber/10",
    icon: (
      <svg className="h-4 w-4 text-accent-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  info: {
    classes: "border-accent-indigo/30 bg-accent-indigo/10",
    icon: (
      <svg className="h-4 w-4 text-accent-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
};

/* =========================================================================
   Toast item
   ========================================================================= */

interface ToastItemProps {
  readonly toast: Toast;
  readonly onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const config = TYPE_CONFIG[toast.type];

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={cn(
        "flex items-start gap-3 rounded-2xl border p-4",
        "backdrop-blur-glass shadow-lg",
        "animate-slide-up",
        config.classes
      )}
    >
      <span aria-hidden="true" className="mt-0.5 flex-shrink-0">
        {config.icon}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-0.5 text-xs text-text-secondary">{toast.description}</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Dismiss notification"
        className="flex-shrink-0 text-text-tertiary transition-colors hover:text-text-secondary"
      >
        <svg
          aria-hidden="true"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/* =========================================================================
   Provider
   ========================================================================= */

interface ToastProviderProps {
  readonly children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (options: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const newToast: Toast = { ...options, id };

      setToasts((prev) => [...prev, newToast]);

      const duration = options.durationMs ?? (options.type === "error" ? 6000 : 4000);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div
          aria-label="Notifications"
          className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2"
        >
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

/* =========================================================================
   Hook
   ========================================================================= */

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
