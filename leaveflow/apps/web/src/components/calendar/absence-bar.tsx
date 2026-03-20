"use client";

/**
 * AbsenceBar — a positioned bar spanning start-end dates.
 *
 * Visual variants:
 * - approved: solid fill
 * - pending_approval: dashed border
 * - rejected: line-through overlay
 * - cancelled: dimmed
 */

import { cn } from "@/lib/utils";
import type { AbsenceStatus } from "@/hooks/use-calendar";

/* =========================================================================
   Types
   ========================================================================= */

interface AbsenceBarProps {
  readonly label: string;
  readonly color: string;
  readonly status: AbsenceStatus;
  readonly startOffset: number; // column index (0-based)
  readonly spanDays: number;
  readonly totalDays: number;
  readonly onClick?: () => void;
  readonly tooltip?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function AbsenceBar({
  label,
  color,
  status,
  startOffset,
  spanDays,
  totalDays,
  onClick,
  tooltip,
}: AbsenceBarProps): React.ReactElement {
  const leftPct = (startOffset / totalDays) * 100;
  const widthPct = (spanDays / totalDays) * 100;

  const isApproved = status === "approved";
  const isPending = status === "pending_approval";
  const isRejected = status === "rejected";
  const isCancelled = status === "cancelled";

  return (
    <div
      className={cn(
        "absolute inset-y-1 flex items-center overflow-hidden rounded transition-all duration-400",
        onClick && "cursor-pointer hover:brightness-110 hover:shadow-lg",
        isCancelled && "opacity-30",
        isRejected && "opacity-50"
      )}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        backgroundColor: isApproved ? `${color}40` : "transparent",
        border: isPending
          ? `1.5px dashed ${color}`
          : isRejected
          ? `1px solid ${color}60`
          : `1px solid ${color}60`,
        minWidth: 4,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={tooltip}
      aria-label={tooltip ?? label}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) onClick();
      }}
    >
      {/* Rejected line-through overlay */}
      {isRejected && (
        <div
          className="absolute inset-0 flex items-center"
          aria-hidden="true"
        >
          <div
            className="h-px w-full"
            style={{ backgroundColor: color, opacity: 0.6 }}
          />
        </div>
      )}

      {/* Label */}
      {spanDays > 1 && (
        <span
          className="relative z-10 truncate px-1.5 font-mono text-[9px] font-semibold"
          style={{ color }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
