"use client";

/**
 * NeedsAttentionCard — pending requests sorted by age, >48h highlighted in rose.
 */

import { cn } from "@/lib/utils";
import type { PendingRequest } from "@/hooks/use-dashboard";

/* =========================================================================
   Types
   ========================================================================= */

interface NeedsAttentionCardProps {
  readonly requests: readonly PendingRequest[];
  readonly onRequestClick?: (id: string) => void;
}

/* =========================================================================
   Helpers
   ========================================================================= */

function formatWaiting(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  return `${Math.floor(hours / 24)}d ${Math.floor(hours % 24)}h`;
}

function formatDateRange(start: string, end: string): string {
  try {
    const s = new Date(start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const e = new Date(end).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return s === e ? s : `${s} – ${e}`;
  } catch {
    return `${start} – ${end}`;
  }
}

/* =========================================================================
   Main component
   ========================================================================= */

export function NeedsAttentionCard({
  requests,
  onRequestClick,
}: NeedsAttentionCardProps): React.ReactElement {
  return (
    <div className="glass-card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          Needs attention
        </p>
        {requests.filter((r) => r.hoursWaiting > 48).length > 0 && (
          <span
            className="rounded-full border border-accent-rose/30 bg-accent-rose/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-rose"
            role="status"
            aria-label="Stale requests needing attention"
          >
            {requests.filter((r) => r.hoursWaiting > 48).length} overdue
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-8 w-8 text-accent-emerald/60"
            aria-hidden="true"
          >
            <path
              d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-sm font-medium text-text-secondary">All caught up!</p>
          <p className="text-xs text-text-tertiary">No pending requests need attention.</p>
        </div>
      ) : (
        <ol
          className="flex flex-col gap-0"
          role="list"
          aria-label="Requests needing attention"
        >
          {requests.map((req, i) => {
            const isStale = req.hoursWaiting > 48;
            return (
              <li
                key={req.id}
                className={cn(
                  "flex items-center gap-3 py-3 transition-colors duration-400",
                  i < requests.length - 1 && "border-b border-white/5",
                  onRequestClick && "cursor-pointer hover:bg-white/3 rounded-xl px-2 -mx-2"
                )}
                onClick={() => onRequestClick?.(req.id)}
                role={onRequestClick ? "button" : undefined}
                tabIndex={onRequestClick ? 0 : undefined}
                onKeyDown={(e) => {
                  if (onRequestClick && (e.key === "Enter" || e.key === " ")) {
                    onRequestClick(req.id);
                  }
                }}
                aria-label={`Request from ${req.employeeName}, waiting ${formatWaiting(req.hoursWaiting)}`}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                    isStale
                      ? "bg-accent-rose/20 text-accent-rose"
                      : "bg-accent-indigo/20 text-accent-indigo"
                  )}
                  aria-hidden="true"
                >
                  {req.initials}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-text-primary">
                    {req.employeeName}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: req.leaveTypeColor }}
                      aria-hidden="true"
                    />
                    <span className="text-xs text-text-secondary">
                      {req.leaveType}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {formatDateRange(req.startDate, req.endDate)}
                    </span>
                  </div>
                </div>

                {/* Waiting time */}
                <div className="shrink-0 text-right">
                  <span
                    className={cn(
                      "font-mono text-xs font-semibold",
                      isStale ? "text-accent-rose" : "text-text-tertiary"
                    )}
                    aria-label={`Waiting ${formatWaiting(req.hoursWaiting)}`}
                  >
                    {formatWaiting(req.hoursWaiting)}
                  </span>
                  {isStale && (
                    <p className="font-mono text-[9px] text-accent-rose/70">overdue</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
