"use client";

/**
 * Registration page — create a new company workspace + admin account.
 *
 * Flow:
 *   1. Collect company name, admin name, email, password, confirm password
 *   2. POST /auth/register → creates tenant + employee + Firebase user
 *   3. Firebase signInWithEmailAndPassword
 *   4. Redirect to /onboarding
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";

/* =========================================================================
   Form field component
   ========================================================================= */

interface FieldProps {
  readonly id: string;
  readonly label: string;
  readonly type?: string;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly error?: string;
  readonly disabled?: boolean;
}

function Field({
  id,
  label,
  type = "text",
  placeholder,
  autoComplete,
  value,
  onChange,
  error,
  disabled,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full rounded-xl border bg-surface-glass px-4 py-2.5",
          "text-sm text-text-primary placeholder:text-text-tertiary",
          "backdrop-blur-glass-sm outline-none",
          "transition-colors duration-300",
          "focus:bg-white/5",
          "disabled:opacity-50",
          error
            ? "border-accent-rose/50 focus:border-accent-rose"
            : "border-border-glass focus:border-accent-indigo/50"
        )}
      />
      {error && (
        <p role="alert" className="text-xs text-accent-rose">
          {error}
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   Validation
   ========================================================================= */

interface FormErrors {
  companyName?: string;
  adminName?: string;
  adminEmail?: string;
  password?: string;
  confirmPassword?: string;
}

function validate(
  companyName: string,
  adminName: string,
  adminEmail: string,
  password: string,
  confirmPassword: string
): FormErrors {
  const errors: FormErrors = {};

  if (!companyName.trim()) {
    errors.companyName = "Company name is required.";
  }
  if (!adminName.trim()) {
    errors.adminName = "Your name is required.";
  }
  if (!adminEmail.trim()) {
    errors.adminEmail = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
    errors.adminEmail = "Please enter a valid email address.";
  }
  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

/* =========================================================================
   Page component
   ========================================================================= */

export default function RegisterPage() {
  const router = useRouter();
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setServerError(null);

    const errors = validate(companyName, adminName, adminEmail, password, confirmPassword);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      await register({
        companyName: companyName.trim(),
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        password,
      });
      router.push("/onboarding");
    } catch (err) {
      const message = (err as Error).message ?? "Registration failed. Please try again.";
      setServerError(message);
    }
  };

  return (
    <div className="glass-card p-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-indigo/20 ring-1 ring-accent-indigo/40 animate-glow">
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-bold text-text-primary">
          Create your workspace
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Set up LeaveFlow for your company
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Server error */}
        {serverError && (
          <div
            role="alert"
            className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose"
          >
            {serverError}
          </div>
        )}

        <Field
          id="companyName"
          label="Company name"
          placeholder="Acme Corp"
          autoComplete="organization"
          value={companyName}
          onChange={setCompanyName}
          error={fieldErrors.companyName}
          disabled={isLoading}
        />

        <Field
          id="adminName"
          label="Your name"
          placeholder="Jane Smith"
          autoComplete="name"
          value={adminName}
          onChange={setAdminName}
          error={fieldErrors.adminName}
          disabled={isLoading}
        />

        <Field
          id="adminEmail"
          label="Work email"
          type="email"
          placeholder="jane@acme.com"
          autoComplete="email"
          value={adminEmail}
          onChange={setAdminEmail}
          error={fieldErrors.adminEmail}
          disabled={isLoading}
        />

        <Field
          id="password"
          label="Password"
          type="password"
          placeholder="Min. 8 characters"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
          disabled={isLoading}
        />

        <Field
          id="confirmPassword"
          label="Confirm password"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={fieldErrors.confirmPassword}
          disabled={isLoading}
        />

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white",
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
              Creating workspace…
            </span>
          ) : (
            "Create workspace"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-tertiary">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-accent-indigo transition-colors hover:text-accent-violet"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
