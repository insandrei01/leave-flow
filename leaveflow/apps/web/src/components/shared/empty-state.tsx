/**
 * EmptyState — illustration + message for when a list or dataset has no items.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Default illustration — abstract dots pattern
   ========================================================================= */

function DefaultIllustration() {
  return (
    <svg
      aria-hidden="true"
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
    >
      <circle cx="40" cy="40" r="36" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
      <circle cx="40" cy="40" r="24" stroke="rgba(255,255,255,0.08)" strokeWidth="2" />
      <circle cx="40" cy="40" r="12" stroke="rgba(129,140,248,0.3)" strokeWidth="2" />
      <circle cx="40" cy="40" r="4" fill="rgba(129,140,248,0.4)" />
      {/* Orbiting dots */}
      <circle cx="40" cy="4" r="3" fill="rgba(129,140,248,0.3)" />
      <circle cx="76" cy="40" r="3" fill="rgba(167,139,250,0.3)" />
      <circle cx="40" cy="76" r="3" fill="rgba(52,211,153,0.3)" />
      <circle cx="4" cy="40" r="3" fill="rgba(251,113,133,0.2)" />
    </svg>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

export interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly illustration?: React.ReactNode;
  readonly action?: React.ReactNode;
  readonly className?: string;
}

export function EmptyState({
  title,
  description,
  illustration,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center py-16 text-center",
        className
      )}
    >
      <div className="mb-5 opacity-60">
        {illustration ?? <DefaultIllustration />}
      </div>

      <h3 className="font-display text-base font-semibold text-text-primary">
        {title}
      </h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-text-tertiary">
          {description}
        </p>
      )}

      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
