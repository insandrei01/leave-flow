"use client";

/**
 * ActivityFeed — scrollable list of last 10 events with action badges.
 */

import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/hooks/use-dashboard";

/* =========================================================================
   Types
   ========================================================================= */

interface ActivityFeedProps {
  readonly events: readonly ActivityEvent[];
}

/* =========================================================================
   Helpers
   ========================================================================= */

const EVENT_STYLES: Record<
  ActivityEvent["type"],
  { color: string; bgClass: string; borderClass: string; label: string }
> = {
  approved: {
    color: "#34D399",
    bgClass: "bg-accent-emerald/15",
    borderClass: "border-accent-emerald/30",
    label: "APPROVED",
  },
  rejected: {
    color: "#FB7185",
    bgClass: "bg-accent-rose/15",
    borderClass: "border-accent-rose/30",
    label: "REJECTED",
  },
  submitted: {
    color: "#818CF8",
    bgClass: "bg-accent-indigo/15",
    borderClass: "border-accent-indigo/30",
    label: "SUBMITTED",
  },
  cancelled: {
    color: "#6B7280",
    bgClass: "bg-white/8",
    borderClass: "border-white/10",
    label: "CANCELLED",
  },
  policy_changed: {
    color: "#22D3EE",
    bgClass: "bg-accent-cyan/15",
    borderClass: "border-accent-cyan/30",
    label: "POLICY",
  },
  escalated: {
    color: "#FBBF24",
    bgClass: "bg-accent-amber/15",
    borderClass: "border-accent-amber/30",
    label: "ESCALATED",
  },
};

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch {
    return "";
  }
}

/* =========================================================================
   Main component
   ========================================================================= */

export function ActivityFeed({ events }: ActivityFeedProps): React.ReactElement {
  return (
    <div className="glass-card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          Recent activity
        </p>
        <span className="font-mono text-[10px] text-text-tertiary">
          {events.length} events
        </span>
      </div>

      {events.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-tertiary">
          No recent activity
        </p>
      ) : (
        <ol
          className="flex max-h-72 flex-col gap-0 overflow-y-auto scrollbar-none"
          aria-label="Activity feed"
        >
          {events.map((event, i) => {
            const style = EVENT_STYLES[event.type];
            return (
              <li
                key={event.id}
                className={cn(
                  "flex items-start gap-3 py-3",
                  i < events.length - 1 && "border-b border-white/5"
                )}
              >
                {/* Dot */}
                <div
                  className="mt-1 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: style.color }}
                  aria-hidden="true"
                />

                {/* Content */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-sm text-text-primary leading-snug">
                    {event.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold",
                        style.bgClass,
                        style.borderClass
                      )}
                      style={{ color: style.color }}
                    >
                      {style.label}
                    </span>
                    <span className="font-mono text-[10px] text-text-tertiary">
                      {relativeTime(event.timestamp)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
