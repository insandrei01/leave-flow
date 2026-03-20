/**
 * ActivityItem — single item in a timeline activity feed.
 *
 * Renders a colored dot, message text, action badge, and relative timestamp.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export type ActivityType =
  | "approved"
  | "rejected"
  | "submitted"
  | "cancelled"
  | "policy_changed"
  | "escalated";

export interface ActivityItemData {
  readonly id: string;
  readonly type: ActivityType;
  readonly message: string;
  readonly timestamp: string;
  readonly actorName?: string;
}

export interface ActivityItemProps {
  readonly item: ActivityItemData;
  readonly showDivider?: boolean;
}

/* =========================================================================
   Config
   ========================================================================= */

const TYPE_CONFIG: Record<
  ActivityType,
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
    bgClass: "bg-white/5",
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

/* =========================================================================
   Helpers
   ========================================================================= */

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
   Component
   ========================================================================= */

export function ActivityItem({ item, showDivider = false }: ActivityItemProps) {
  const config = TYPE_CONFIG[item.type];

  return (
    <li
      className={cn(
        "flex items-start gap-3 py-3",
        showDivider && "border-b border-white/5"
      )}
    >
      {/* Colored dot */}
      <div
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: config.color }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-sm leading-snug text-text-primary">{item.message}</p>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold",
              config.bgClass,
              config.borderClass
            )}
            style={{ color: config.color }}
          >
            {config.label}
          </span>
          {item.actorName && (
            <span className="text-[11px] text-text-tertiary">{item.actorName}</span>
          )}
          <span className="font-mono text-[10px] text-text-tertiary">
            {relativeTime(item.timestamp)}
          </span>
        </div>
      </div>
    </li>
  );
}
