/**
 * LeaveTypeBadge — colored dot + label for a leave type.
 *
 * Used in tables, calendars, and request cards to identify the leave type
 * at a glance via a color dot.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface LeaveTypeBadgeProps {
  /** Leave type display name */
  readonly label: string;
  /** Hex or CSS color for the dot */
  readonly color: string;
  /** Optional additional classes */
  readonly className?: string;
  /** Show a bordered pill vs. plain dot+text */
  readonly variant?: "pill" | "inline";
}

/* =========================================================================
   Component
   ========================================================================= */

export function LeaveTypeBadge({
  label,
  color,
  className,
  variant = "inline",
}: LeaveTypeBadgeProps) {
  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-border-glass px-2.5 py-0.5",
          "text-xs font-medium text-text-secondary",
          className
        )}
      >
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        {label}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <span
        aria-hidden="true"
        className="h-2 w-2 flex-shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-text-secondary">{label}</span>
    </span>
  );
}
