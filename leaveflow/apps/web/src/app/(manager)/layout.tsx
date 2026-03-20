"use client";

/**
 * Manager layout — guards routes under (manager) group.
 *
 * Verifies that the current user has manager or admin role.
 * Redirects to /dashboard if the user is unauthorized.
 *
 * Role check is done client-side using the Firebase Auth custom claims.
 * Server-side enforcement is handled by the API.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/* =========================================================================
   Types
   ========================================================================= */

type AuthState = "loading" | "authorized" | "unauthorized";

interface ManagerLayoutProps {
  readonly children: React.ReactNode;
}

/* =========================================================================
   Allowed roles
   ========================================================================= */

const MANAGER_ROLES = new Set(["manager", "hr_admin", "super_admin"]);

/* =========================================================================
   Component
   ========================================================================= */

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>("loading");

  useEffect(() => {
    const auth = getAuth();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      // Check custom claims for role
      user
        .getIdTokenResult()
        .then((tokenResult) => {
          const role = tokenResult.claims["role"] as string | undefined;

          if (role && MANAGER_ROLES.has(role)) {
            setAuthState("authorized");
          } else {
            setAuthState("unauthorized");
            router.replace("/dashboard");
          }
        })
        .catch(() => {
          setAuthState("unauthorized");
          router.replace("/dashboard");
        });
    });

    return () => unsubscribe();
  }, [router]);

  if (authState === "loading") {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        aria-busy="true"
        aria-label="Checking permissions"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent-indigo border-t-transparent" />
          <p className="text-sm text-text-secondary">Checking permissions…</p>
        </div>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return null;
  }

  return <>{children}</>;
}
