/**
 * ErrorState — error state display with optional retry action.
 *
 * Use for section-level or page-level error handling UI.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface ErrorStateProps {
  readonly title?: string;
  readonly message: string;
  readonly onRetry?: () => void;
  readonly className?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center gap-4 rounded-2xl border border-accent-rose/20 bg-accent-rose/5 px-6 py-10 text-center",
        className
      )}
    >
      {/* Icon */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="h-10 w-10 text-accent-rose/60"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M12 8v4M12 16h.01"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>

      {/* Text */}
      <div>
        <h3 className="font-display text-sm font-semibold text-text-primary">
          {title}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{message}</p>
      </div>

      {/* Retry button */}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-semibold text-accent-indigo transition-all duration-400 hover:bg-accent-indigo/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-indigo"
        >
          Try again
        </button>
      )}
    </div>
  );
}
