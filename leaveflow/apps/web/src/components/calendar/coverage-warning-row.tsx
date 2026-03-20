"use client";

/**
 * CoverageWarningRow — amber/rose indicators below team rows when
 * team coverage falls below the configured threshold for any day.
 */

import { cn } from "@/lib/utils";
import type { CoverageWarning } from "@/hooks/use-calendar";
import type { DayColumn } from "./date-header";

interface CoverageWarningRowProps {
  readonly teamId: string;
  readonly warnings: readonly CoverageWarning[];
  readonly days: readonly DayColumn[];
  readonly employeeColumnWidth: number;
}

export function CoverageWarningRow({
  teamId,
  warnings,
  days,
  employeeColumnWidth,
}: CoverageWarningRowProps): React.ReactElement | null {
  const teamWarnings = warnings.filter((w) => w.teamId === teamId);
  if (teamWarnings.length === 0) return null;

  const warningMap = new Map(teamWarnings.map((w) => [w.date, w]));

  return (
    <div
      className="flex items-center border-b border-white/3"
      style={{ height: 20 }}
      role="row"
      aria-label="Coverage warnings"
    >
      {/* Label column */}
      <div
        className="flex shrink-0 items-center border-r border-white/5 px-3"
        style={{ width: employeeColumnWidth, height: 20 }}
      >
        <span className="font-mono text-[9px] text-text-tertiary">coverage</span>
      </div>

      {/* Day cells */}
      <div
        className="relative flex-1"
        style={{ height: 20 }}
        role="gridcell"
      >
        {days.map((day, i) => {
          const warning = warningMap.get(day.date);
          if (!warning) return null;

          const isCritical = warning.coveragePercent < warning.threshold * 0.5;
          const leftPct = (i / days.length) * 100;
          const widthPct = (1 / days.length) * 100;

          return (
            <div
              key={day.date}
              className={cn(
                "absolute inset-y-1 rounded-sm",
                isCritical ? "bg-accent-rose/40" : "bg-accent-amber/40"
              )}
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
              title={`${warning.presentCount}/${warning.teamSize} present (${Math.round(warning.coveragePercent * 100)}%)`}
              aria-label={`${day.date}: ${Math.round(warning.coveragePercent * 100)}% coverage — below threshold`}
            />
          );
        })}
      </div>
    </div>
  );
}
