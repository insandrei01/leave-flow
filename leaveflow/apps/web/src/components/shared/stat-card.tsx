/**
 * StatCard — KPI card with label, value, trend indicator, and sparkline slot.
 */

import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";

/* =========================================================================
   Trend indicator
   ========================================================================= */

interface TrendProps {
  readonly value: number;
  readonly label?: string;
}

function Trend({ value, label }: TrendProps) {
  const isPositive = value > 0;
  const isNeutral = value === 0;

  return (
    <span
      aria-label={`Trend: ${value > 0 ? "+" : ""}${value}${label ? ` ${label}` : ""}`}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5",
        "font-mono text-[10px] font-medium",
        isNeutral && "bg-white/5 text-text-tertiary",
        !isNeutral && isPositive && "bg-accent-emerald/15 text-accent-emerald",
        !isNeutral && !isPositive && "bg-accent-rose/15 text-accent-rose"
      )}
    >
      {!isNeutral && (
        <svg
          aria-hidden="true"
          className={cn("h-2.5 w-2.5", !isPositive && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
        </svg>
      )}
      {value > 0 ? "+" : ""}{value}{label ? ` ${label}` : ""}
    </span>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

export interface StatCardProps {
  readonly label: string;
  readonly value: string | number;
  readonly description?: string;
  readonly icon?: React.ReactNode;
  readonly trend?: number;
  readonly trendLabel?: string;
  /** Slot for a sparkline chart component */
  readonly sparkline?: React.ReactNode;
  readonly className?: string;
}

export function StatCard({
  label,
  value,
  description,
  icon,
  trend,
  trendLabel,
  sparkline,
  className,
}: StatCardProps) {
  return (
    <GlassCard className={cn("flex flex-col gap-3", className)}>
      {/* Header: label + icon */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">{label}</p>
        {icon && (
          <span aria-hidden="true" className="text-text-tertiary">
            {icon}
          </span>
        )}
      </div>

      {/* Value */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <p className="font-display text-3xl font-bold text-text-primary">
            {value}
          </p>
          {description && (
            <p className="mt-0.5 text-xs text-text-tertiary">{description}</p>
          )}
        </div>
        {trend !== undefined && (
          <Trend value={trend} label={trendLabel} />
        )}
      </div>

      {/* Sparkline slot */}
      {sparkline && <div className="mt-auto">{sparkline}</div>}
    </GlassCard>
  );
}
