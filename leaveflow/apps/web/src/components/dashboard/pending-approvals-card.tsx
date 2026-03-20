"use client";

/**
 * PendingApprovalsCard — count + stale badge (rose if > 0).
 */

import { cn } from "@/lib/utils";
import type { PendingApprovalsData } from "@/hooks/use-dashboard";

interface PendingApprovalsCardProps {
  readonly data: PendingApprovalsData;
  readonly onViewAll?: () => void;
}

export function PendingApprovalsCard({
  data,
  onViewAll,
}: PendingApprovalsCardProps): React.ReactElement {
  return (
    <div className="glass-card flex flex-col gap-4 p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Pending approvals
          </p>
          <p className="mt-1 font-display text-3xl font-bold text-text-primary">
            {data.count}
          </p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-indigo/15">
          <svg
            viewBox="0 0 20 20"
            fill="none"
            className="h-5 w-5 text-accent-indigo"
            aria-hidden="true"
          >
            <path
              d="M9 5H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Stale badge */}
      <div className="flex items-center justify-between">
        {data.staleCount > 0 ? (
          <span
            className="flex items-center gap-1.5 rounded-full border border-accent-rose/30 bg-accent-rose/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-accent-rose"
            role="status"
            aria-label={`${data.staleCount} stale requests over 48 hours`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-rose" aria-hidden="true" />
            {data.staleCount} stale (&gt;48h)
          </span>
        ) : (
          <span className="font-mono text-[11px] text-accent-emerald">
            All within SLA
          </span>
        )}

        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className={cn(
              "font-mono text-[11px] transition-colors duration-400",
              data.count > 0
                ? "text-accent-indigo hover:text-accent-violet"
                : "cursor-default text-text-tertiary"
            )}
            aria-label="View all pending approvals"
          >
            View all
          </button>
        )}
      </div>
    </div>
  );
}
