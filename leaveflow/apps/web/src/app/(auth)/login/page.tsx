"use client";

/**
 * Login page — email + password authentication via Firebase.
 *
 * On success, redirects to /dashboard.
 * Shows inline error messages for invalid credentials.
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

/* =========================================================================
   Error message helpers
   ========================================================================= */

function getFirebaseErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    "auth/user-not-found": "No account found with this email address.",
    "auth/wrong-password": "Incorrect password. Please try again.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/user-disabled": "This account has been disabled. Contact support.",
    "auth/too-many-requests": "Too many failed attempts. Please try again later.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
  };
  return messages[code] ?? "Sign in failed. Please try again.";
}

/* =========================================================================
   Logo mark
   ========================================================================= */

function LogoMark() {
  return (
    <div className="mb-8 flex flex-col items-center gap-3">
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
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-text-primary">
          LeaveFlow
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Sign in to your workspace
        </p>
      </div>
    </div>
  );
}

/* =========================================================================
   Page component
   ========================================================================= */

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      await login(email.trim(), password);
      router.push("/dashboard");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
    }
  };

  return (
    <div className="glass-card p-8">
      <LogoMark />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose"
          >
            {error}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-secondary"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={cn(
              "w-full rounded-xl border border-border-glass bg-surface-glass px-4 py-2.5",
              "text-sm text-text-primary placeholder:text-text-tertiary",
              "backdrop-blur-glass-sm outline-none",
              "transition-colors duration-300",
              "focus:border-accent-indigo/50 focus:bg-white/5",
              "disabled:opacity-50"
            )}
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-secondary"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={cn(
              "w-full rounded-xl border border-border-glass bg-surface-glass px-4 py-2.5",
              "text-sm text-text-primary placeholder:text-text-tertiary",
              "backdrop-blur-glass-sm outline-none",
              "transition-colors duration-300",
              "focus:border-accent-indigo/50 focus:bg-white/5",
              "disabled:opacity-50"
            )}
            disabled={isLoading}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
            "bg-gradient-to-r from-accent-indigo to-accent-violet",
            "transition-all duration-300 ease-spring",
            "hover:brightness-110 hover:shadow-[0_0_16px_rgba(129,140,248,0.4)]",
            "active:scale-[0.98]",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                aria-hidden="true"
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in…
            </span>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-6 text-center text-sm text-text-tertiary">
        No account yet?{" "}
        <Link
          href="/register"
          className="font-medium text-accent-indigo transition-colors hover:text-accent-violet"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
