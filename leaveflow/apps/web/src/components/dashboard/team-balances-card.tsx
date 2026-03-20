"use client";

/**
 * TeamBalancesCard — per-team average balance bars per leave type.
 */

import type { TeamBalance } from "@/hooks/use-dashboard";

interface TeamBalancesCardProps {
  readonly teams: readonly TeamBalance[];
}

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
}): React.ReactElement {
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

export function TeamBalancesCard({
  teams,
}: TeamBalancesCardProps): React.ReactElement {
  return (
    <div className="glass-card flex flex-col gap-4 p-5">
      <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
        Team balances
      </p>

      {teams.length === 0 ? (
        <p className="py-2 text-sm text-text-tertiary">No teams configured.</p>
      ) : (
        <div className="flex flex-col gap-5">
          {teams.map((team) => (
            <div key={team.teamId} className="flex flex-col gap-2">
              <p className="text-sm font-semibold text-text-primary">
                {team.teamName}
              </p>
              <div className="flex flex-col gap-2">
                {team.leaveTypes.map((lt) => (
                  <BalanceBar
                    key={lt.name}
                    name={lt.name}
                    color={lt.color}
                    remaining={lt.averageRemaining}
                    total={lt.total}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
