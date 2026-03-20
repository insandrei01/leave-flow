/**
 * HeatmapCell — single GitHub-contribution-style cell for absence heatmaps.
 *
 * Color intensity represents the number of absences on a given day.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface HeatmapCellProps {
  readonly date: string;
  readonly count: number;
  readonly maxCount: number;
  readonly isToday?: boolean;
  readonly dayOfMonth?: number;
  readonly onClick?: (date: string) => void;
  readonly className?: string;
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

function getCountLabel(count: number): string {
  if (count === 0) return "No absences";
  if (count === 1) return "1 absence";
  return `${count} absences`;
}

/* =========================================================================
   Component
   ========================================================================= */

export function HeatmapCell({
  date,
  count,
  maxCount,
  isToday = false,
  onClick,
  className,
}: HeatmapCellProps) {
  const label = `${date}: ${getCountLabel(count)}`;

  if (onClick) {
    return (
      <button
        type="button"
        role="gridcell"
        onClick={() => onClick(date)}
        title={label}
        aria-label={label}
        className={cn(
          "aspect-square rounded-sm transition-all duration-400",
          "hover:scale-110 hover:ring-1 hover:ring-white/30",
          getIntensityClass(count, maxCount),
          isToday && "ring-1 ring-accent-indigo/60",
          className
        )}
      />
    );
  }

  return (
    <div
      role="gridcell"
      aria-label={label}
      className={cn(
        "aspect-square rounded-sm",
        getIntensityClass(count, maxCount),
        isToday && "ring-1 ring-accent-indigo/60",
        className
      )}
    />
  );
}
