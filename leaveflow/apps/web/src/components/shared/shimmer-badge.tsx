/**
 * ShimmerBadge — badge with shimmer animation for awaiting/loading states.
 *
 * Used to indicate that a value is being computed or an action is pending.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface ShimmerBadgeProps {
  readonly label: string;
  readonly className?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function ShimmerBadge({ label, className }: ShimmerBadgeProps) {
  return (
    <span
      className={cn(
        "shimmer inline-flex items-center rounded-full px-2.5 py-0.5",
        "border border-accent-amber/25 font-mono text-[11px] font-medium text-accent-amber",
        className
      )}
    >
      {label}
    </span>
  );
}
