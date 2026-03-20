"use client";

/**
 * AppShell — root client wrapper for authenticated pages.
 *
 * Responsibilities:
 * 1. Mount the onAuthStateChanged listener (via useAuth)
 * 2. Redirect to /login if not authenticated (after initial load)
 * 3. Show a full-screen loading state while Firebase resolves auth
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

/* =========================================================================
   Loading screen
   ========================================================================= */

function LoadingScreen() {
  return (
    <div
      aria-label="Loading"
      role="status"
      className="flex h-screen items-center justify-center bg-surface-primary"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-indigo/20 ring-1 ring-accent-indigo/40 animate-glow">
          <svg
            aria-hidden="true"
            className="h-6 w-6 text-accent-indigo"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 w-1.5 rounded-full bg-accent-indigo/60 animate-pulse"
              )}
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

interface AppShellProps {
  readonly children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    // Render nothing while redirect is in flight
    return null;
  }

  return <>{children}</>;
}
