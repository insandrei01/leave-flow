"use client";

/**
 * UpcomingWeekCard — 5-day mini bar chart of absence counts.
 */

import { cn } from "@/lib/utils";
import type { UpcomingDayData } from "@/hooks/use-dashboard";

interface UpcomingWeekCardProps {
  readonly data: readonly UpcomingDayData[];
}

export function UpcomingWeekCard({ data }: UpcomingWeekCardProps): React.ReactElement {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="glass-card flex flex-col gap-4 p-5 animate-slide-up">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-text-tertiary">
          Upcoming week
        </p>
        <p className="mt-1 font-display text-3xl font-bold text-text-primary">
          {data.reduce((s, d) => s + d.count, 0)}
        </p>
        <p className="mt-0.5 text-xs text-text-tertiary">absences scheduled</p>
      </div>

      {/* Bar chart */}
      <div
        className="flex items-end gap-1.5"
        role="img"
        aria-label="Upcoming week absence chart"
      >
        {data.map((day) => {
          const heightPct = (day.count / maxCount) * 100;
          return (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-mono text-[9px] text-text-tertiary">
                {day.count > 0 ? day.count : ""}
              </span>
              <div
                className="w-full overflow-hidden rounded-t-sm bg-white/8"
                style={{ height: 32 }}
                aria-hidden="true"
              >
                <div
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-600",
                    day.count > 0
                      ? "bg-gradient-to-t from-accent-indigo/60 to-accent-violet/60"
                      : "bg-transparent"
                  )}
                  style={{
                    height: `${heightPct}%`,
                    marginTop: `${100 - heightPct}%`,
                  }}
                />
              </div>
              <span className="font-mono text-[9px] text-text-tertiary">
                {day.dayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
