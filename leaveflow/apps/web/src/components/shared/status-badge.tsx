/**
 * StatusBadge — colored pill badge for leave request statuses.
 *
 * Status → color mapping:
 *   approved / auto_approved → emerald
 *   pending_approval / pending_validation → amber
 *   rejected / validation_failed → rose
 *   cancelled → gray
 */

import { cn } from "@/lib/utils";
import type { LeaveRequestStatus } from "@leaveflow/shared-types";

/* =========================================================================
   Config
   ========================================================================= */

const STATUS_CONFIG: Record<
  LeaveRequestStatus,
  { label: string; classes: string }
> = {
  approved: {
    label: "Approved",
    classes: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/25",
  },
  auto_approved: {
    label: "Auto-approved",
    classes: "bg-accent-emerald/15 text-accent-emerald border-accent-emerald/25",
  },
  pending_approval: {
    label: "Pending",
    classes: "bg-accent-amber/15 text-accent-amber border-accent-amber/25",
  },
  pending_validation: {
    label: "Validating",
    classes: "bg-accent-amber/15 text-accent-amber border-accent-amber/25",
  },
  rejected: {
    label: "Rejected",
    classes: "bg-accent-rose/15 text-accent-rose border-accent-rose/25",
  },
  validation_failed: {
    label: "Failed",
    classes: "bg-accent-rose/15 text-accent-rose border-accent-rose/25",
  },
  cancelled: {
    label: "Cancelled",
    classes: "bg-white/5 text-text-tertiary border-border-glass",
  },
};

/* =========================================================================
   Component
   ========================================================================= */

export interface StatusBadgeProps {
  readonly status: LeaveRequestStatus;
  readonly className?: string;
  /** Show a colored dot before the label. */
  readonly showDot?: boolean;
}

export function StatusBadge({
  status,
  className,
  showDot = false,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "font-mono text-[11px] font-medium",
        config.classes,
        className
      )}
    >
      {showDot && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-current"
        />
      )}
      {config.label}
    </span>
  );
}
