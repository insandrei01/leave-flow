"use client";

/**
 * UtilizationCard — leave utilization percentage with a mini radial chart.
 */

import { cn } from "@/lib/utils";
import type { UtilizationData } from "@/hooks/use-dashboard";

const RADIUS = 28;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface UtilizationCardProps {
  readonly data: UtilizationData;
}

export function UtilizationCard({ data }: UtilizationCardProps): React.ReactElement {
  const clampedPct = Math.min(100, Math.max(0, data.percentage));
  const offset = CIRCUMFERENCE * (1 - clampedPct / 100);
  const isHigh = clampedPct >= 80;

  return (
    <div className="glass-card flex flex-col gap-4 p-5 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
            Utilization rate
          </p>
          <p
            className={cn(
              "mt-1 font-display text-3xl font-bold",
              isHigh ? "text-accent-amber" : "text-text-primary"
            )}
          >
            {clampedPct}%
          </p>
        </div>

        {/* Mini radial chart */}
        <div className="relative h-16 w-16" aria-hidden="true">
          <svg viewBox="0 0 72 72" className="h-16 w-16 -rotate-90">
            <defs>
              <linearGradient id="util-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={isHigh ? "#FBBF24" : "#818CF8"} />
                <stop offset="100%" stopColor={isHigh ? "#FB7185" : "#34D399"} />
              </linearGradient>
            </defs>
            {/* Track */}
            <circle
              cx="36"
              cy="36"
              r={RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="6"
            />
            {/* Fill */}
            <circle
              cx="36"
              cy="36"
              r={RADIUS}
              fill="none"
              stroke="url(#util-gradient)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-600"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] font-semibold text-text-secondary">
            {clampedPct}%
          </span>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center gap-1.5">
        <svg
          viewBox="0 0 12 12"
          fill="none"
          className={cn(
            "h-3 w-3",
            data.trend > 0 ? "text-accent-rose rotate-0" : "text-accent-emerald rotate-180"
          )}
          aria-hidden="true"
        >
          <path
            d="M6 2v8M2 6l4-4 4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span
          className={cn(
            "font-mono text-[11px]",
            data.trend > 0 ? "text-accent-rose" : "text-accent-emerald"
          )}
        >
          {data.trend > 0 ? "+" : ""}
          {data.trend}% vs last month
        </span>
      </div>
    </div>
  );
}
