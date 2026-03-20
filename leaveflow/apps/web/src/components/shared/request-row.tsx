/**
 * RequestRow — leave request row for tables and list views.
 *
 * Displays employee, leave type, date range, working days, and status.
 * Supports click interaction for navigation to detail.
 */

import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/shared/status-badge";

/* Re-use the same status type as StatusBadge to avoid cross-package dependency */
export type LeaveRequestStatus =
  | "pending_validation"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "auto_approved"
  | "validation_failed";

/* =========================================================================
   Types
   ========================================================================= */

export interface RequestRowData {
  readonly id: string;
  readonly employeeName: string;
  readonly initials: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly status: LeaveRequestStatus;
  readonly submittedAt: string;
}

export interface RequestRowProps {
  readonly request: RequestRowData;
  readonly onClick?: (id: string) => void;
  readonly showDivider?: boolean;
}

/* =========================================================================
   Helpers
   ========================================================================= */

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const e = new Date(end).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    return s === e ? s : `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

function formatSubmitted(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

/* =========================================================================
   Component
   ========================================================================= */

export function RequestRow({ request, onClick, showDivider = true }: RequestRowProps) {
  const isClickable = Boolean(onClick);

  return (
    <div
      className={cn(
        "flex items-center gap-4 py-3 transition-colors duration-400",
        showDivider && "border-b border-white/5",
        isClickable &&
          "cursor-pointer rounded-xl px-3 -mx-3 hover:bg-white/3"
      )}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={`Leave request from ${request.employeeName}`}
      onClick={() => onClick?.(request.id)}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          onClick(request.id);
        }
      }}
    >
      {/* Avatar */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-indigo/20 font-mono text-xs font-semibold text-accent-indigo"
        aria-hidden="true"
      >
        {request.initials}
      </div>

      {/* Employee + leave type */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {request.employeeName}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: request.leaveTypeColor }}
            aria-hidden="true"
          />
          <span className="text-xs text-text-secondary">{request.leaveTypeName}</span>
          <span className="text-xs text-text-tertiary">
            {formatDateRange(request.startDate, request.endDate)}
          </span>
        </div>
      </div>

      {/* Days + submitted */}
      <div className="shrink-0 text-right">
        <p className="font-mono text-xs font-semibold text-text-secondary">
          {request.workingDays}d
        </p>
        <p className="font-mono text-[10px] text-text-tertiary">
          {formatSubmitted(request.submittedAt)}
        </p>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <StatusBadge status={request.status} />
      </div>
    </div>
  );
}
