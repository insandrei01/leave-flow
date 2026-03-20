"use client";

/**
 * DateRangePicker — date range selector with glass styling.
 *
 * Renders two native date inputs (start + end) with glass card wrapper.
 * Validates that end date is not before start date.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface DateRange {
  readonly startDate: string; // ISO date string: YYYY-MM-DD
  readonly endDate: string;
}

export interface DateRangePickerProps {
  readonly value: DateRange;
  readonly onChange: (range: DateRange) => void;
  readonly minDate?: string;
  readonly maxDate?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly error?: string;
}

/* =========================================================================
   Input style helper
   ========================================================================= */

const inputClass = cn(
  "w-full rounded-xl border border-border-glass bg-surface-glass px-3 py-2",
  "text-sm text-text-primary",
  "[color-scheme:dark]",
  "outline-none transition-colors duration-300",
  "focus:border-accent-indigo/50 focus:bg-white/5",
  "disabled:cursor-not-allowed disabled:opacity-50"
);

/* =========================================================================
   Component
   ========================================================================= */

export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
  className,
  startLabel = "Start date",
  endLabel = "End date",
  error,
}: DateRangePickerProps) {
  const handleStartChange = (newStart: string) => {
    // If new start is after current end, reset end
    const newRange: DateRange =
      value.endDate && newStart > value.endDate
        ? { startDate: newStart, endDate: newStart }
        : { startDate: newStart, endDate: value.endDate };

    onChange(newRange);
  };

  const handleEndChange = (newEnd: string) => {
    onChange({ startDate: value.startDate, endDate: newEnd });
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex gap-3">
        <div className="flex-1 space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary">
            {startLabel}
          </label>
          <input
            type="date"
            value={value.startDate}
            min={minDate}
            max={maxDate}
            disabled={disabled}
            onChange={(e) => handleStartChange(e.target.value)}
            aria-label={startLabel}
            className={inputClass}
          />
        </div>

        {/* Separator */}
        <div className="flex flex-col justify-end pb-2">
          <svg
            aria-hidden="true"
            className="h-4 w-4 text-text-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>

        <div className="flex-1 space-y-1.5">
          <label className="block text-xs font-medium text-text-secondary">
            {endLabel}
          </label>
          <input
            type="date"
            value={value.endDate}
            min={value.startDate || minDate}
            max={maxDate}
            disabled={disabled}
            onChange={(e) => handleEndChange(e.target.value)}
            aria-label={endLabel}
            className={inputClass}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-accent-rose">
          {error}
        </p>
      )}
    </div>
  );
}
