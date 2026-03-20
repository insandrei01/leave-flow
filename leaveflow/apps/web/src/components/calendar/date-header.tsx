"use client";

/**
 * DateHeader — day column headers with date numbers, today highlighted.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface DayColumn {
  readonly date: string; // ISO YYYY-MM-DD
  readonly dayOfMonth: number;
  readonly dayLabel: string; // Mon, Tue...
  readonly isToday: boolean;
  readonly isWeekend: boolean;
}

interface DateHeaderProps {
  readonly days: readonly DayColumn[];
  readonly employeeColumnWidth: number;
}

/* =========================================================================
   Component
   ========================================================================= */

export function DateHeader({
  days,
  employeeColumnWidth,
}: DateHeaderProps): React.ReactElement {
  return (
    <div
      className="flex border-b border-white/5 bg-surface-secondary/80 backdrop-blur-glass-sm"
      role="row"
      aria-label="Date columns"
    >
      {/* Employee name column spacer */}
      <div
        className="shrink-0 border-r border-white/5"
        style={{ width: employeeColumnWidth }}
        aria-hidden="true"
      />

      {/* Day columns */}
      {days.map((day) => (
        <div
          key={day.date}
          role="columnheader"
          aria-label={`${day.dayLabel} ${day.dayOfMonth}`}
          className={cn(
            "flex flex-1 flex-col items-center justify-center py-2 transition-colors",
            day.isToday && "bg-accent-indigo/10",
            day.isWeekend && !day.isToday && "bg-white/2"
          )}
          style={{ minWidth: 28 }}
        >
          <span
            className={cn(
              "font-mono text-[9px] uppercase",
              day.isToday ? "text-accent-indigo" : "text-text-tertiary"
            )}
          >
            {day.dayLabel}
          </span>
          <span
            className={cn(
              "font-mono text-xs font-semibold",
              day.isToday
                ? "text-accent-indigo"
                : day.isWeekend
                ? "text-text-tertiary"
                : "text-text-secondary"
            )}
          >
            {day.dayOfMonth}
          </span>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   Build day columns helper
   ========================================================================= */

export function buildDayColumns(month: string): DayColumn[] {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr) - 1;

  const daysInMonth = new Date(year, m + 1, 0).getDate();
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

  return Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const date = new Date(year, m, d);
    const isoDate = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dow = date.getDay();
    return {
      date: isoDate,
      dayOfMonth: d,
      dayLabel: DAY_LABELS[dow] ?? "?",
      isToday: isoDate === todayStr,
      isWeekend: dow === 0 || dow === 6,
    };
  });
}
