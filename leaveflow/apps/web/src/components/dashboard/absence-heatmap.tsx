"use client";

/**
 * AbsenceHeatmap — GitHub-contribution-style heatmap for a month.
 *
 * Color intensity: emerald (low) → amber → rose (high).
 */

import { cn } from "@/lib/utils";
import type { HeatmapDayData } from "@/hooks/use-dashboard";

/* =========================================================================
   Types
   ========================================================================= */

interface AbsenceHeatmapProps {
  readonly data: readonly HeatmapDayData[];
  readonly onDayClick?: (date: string) => void;
}

/* =========================================================================
   Helpers
   ========================================================================= */

function getIntensityClass(count: number, max: number): string {
  if (count === 0) return "bg-white/5";
  const ratio = count / Math.max(max, 1);
  if (ratio < 0.25) return "bg-accent-emerald/30";
  if (ratio < 0.5) return "bg-accent-emerald/60";
  if (ratio < 0.75) return "bg-accent-amber/60";
  return "bg-accent-rose/70";
}

function getIntensityLabel(count: number): string {
  if (count === 0) return "No absences";
  if (count === 1) return "1 absence";
  return `${count} absences`;
}

function getDayLabel(isoDate: string): string {
  try {
    return new Date(isoDate).getDate().toString();
  } catch {
    return "";
  }
}

function buildWeekRows(
  days: readonly HeatmapDayData[]
): readonly (HeatmapDayData | null)[][] {
  if (days.length === 0) return [];

  // Pad the first week with nulls so day 1 aligns to the correct column
  const firstDay = new Date(days[0]!.date);
  const startWeekday = firstDay.getDay(); // 0=Sun
  const padded: (HeatmapDayData | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...days,
  ];

  const weeks: (HeatmapDayData | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    const week = padded.slice(i, i + 7);
    // Pad end of last week
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/* =========================================================================
   Main component
   ========================================================================= */

export function AbsenceHeatmap({
  data,
  onDayClick,
}: AbsenceHeatmapProps): React.ReactElement {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const weeks = buildWeekRows(data);

  return (
    <div className="glass-card flex flex-col gap-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Absence heatmap
          </p>
          <p className="mt-0.5 text-xs text-text-secondary">
            This month — click a day to filter calendar
          </p>
        </div>

        {/* Legend */}
        <div
          className="flex items-center gap-1.5"
          role="img"
          aria-label="Heatmap intensity legend"
        >
          <span className="font-mono text-[10px] text-text-tertiary">Low</span>
          {["bg-accent-emerald/30", "bg-accent-emerald/60", "bg-accent-amber/60", "bg-accent-rose/70"].map(
            (cls, i) => (
              <div
                key={i}
                className={cn("h-3 w-3 rounded-sm", cls)}
                aria-hidden="true"
              />
            )
          )}
          <span className="font-mono text-[10px] text-text-tertiary">High</span>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
        aria-hidden="true"
      >
        {DAY_LABELS.map((d) => (
          <div
            key={d}
            className="text-center font-mono text-[9px] uppercase text-text-tertiary"
          >
            {d[0]}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div
        className="flex flex-col gap-1"
        role="grid"
        aria-label="Absence heatmap"
      >
        {weeks.map((week, wi) => (
          <div
            key={wi}
            role="row"
            className="grid gap-1"
            style={{ gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {week.map((day, di) => {
              if (!day) {
                return <div key={di} className="aspect-square" aria-hidden="true" />;
              }
              return (
                <button
                  key={day.date}
                  role="gridcell"
                  type="button"
                  onClick={() => onDayClick?.(day.date)}
                  title={`${getDayLabel(day.date)} — ${getIntensityLabel(day.count)}`}
                  aria-label={`${day.date}: ${getIntensityLabel(day.count)}`}
                  className={cn(
                    "aspect-square rounded-sm transition-all duration-400 hover:scale-110 hover:ring-1 hover:ring-white/30",
                    getIntensityClass(day.count, maxCount),
                    day.isToday && "ring-1 ring-accent-indigo/60"
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
