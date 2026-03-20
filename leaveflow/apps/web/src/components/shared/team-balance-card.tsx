/**
 * TeamBalanceCard — mini bar chart showing leave balance per leave type for a team.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface LeaveTypeBalance {
  readonly name: string;
  readonly color: string;
  readonly averageRemaining: number;
  readonly total: number;
}

export interface TeamBalanceCardProps {
  readonly teamName: string;
  readonly leaveTypes: readonly LeaveTypeBalance[];
  readonly className?: string;
}

/* =========================================================================
   Bar component
   ========================================================================= */

function BalanceBar({
  name,
  color,
  remaining,
  total,
}: {
  readonly name: string;
  readonly color: string;
  readonly remaining: number;
  readonly total: number;
}) {
  const pct = total > 0 ? Math.min(100, (remaining / total) * 100) : 0;
  const isLow = pct < 20;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-secondary">{name}</span>
        <span
          className="font-mono text-[11px] font-semibold"
          style={{ color: isLow ? "#FBBF24" : color }}
        >
          {remaining}d
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name}: ${remaining} of ${total} days remaining`}
      >
        <div
          className="h-full rounded-full transition-all duration-600"
          style={{
            width: `${pct}%`,
            backgroundColor: isLow ? "#FBBF24" : color,
            opacity: 0.7,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

export function TeamBalanceCard({
  teamName,
  leaveTypes,
  className,
}: TeamBalanceCardProps) {
  return (
    <div className={cn("glass-card flex flex-col gap-3 p-4", className)}>
      <p className="text-sm font-semibold text-text-primary">{teamName}</p>

      {leaveTypes.length === 0 ? (
        <p className="text-xs text-text-tertiary">No balances configured.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {leaveTypes.map((lt) => (
            <BalanceBar
              key={lt.name}
              name={lt.name}
              color={lt.color}
              remaining={lt.averageRemaining}
              total={lt.total}
            />
          ))}
        </div>
      )}
    </div>
  );
}
