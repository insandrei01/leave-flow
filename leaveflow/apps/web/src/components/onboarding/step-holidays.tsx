"use client";

/**
 * StepHolidays — Step 6 (skippable): Configure public holidays.
 *
 * Auto-loads country holidays, allows toggle on/off and custom additions.
 */

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import type { OnboardingData, HolidayEntry } from "@/hooks/use-onboarding";

/* =========================================================================
   Types
   ========================================================================= */

interface StepHolidaysProps {
  readonly data: OnboardingData;
  readonly onChange: (patch: Partial<OnboardingData>) => void;
}

/* =========================================================================
   Helper
   ========================================================================= */

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function formatDate(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

/* =========================================================================
   Main component
   ========================================================================= */

export function StepHolidays({
  data,
  onChange,
}: StepHolidaysProps): React.ReactElement {
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customForm, setCustomForm] = useState({ name: "", date: "" });
  const [formError, setFormError] = useState<string | null>(null);

  /* Auto-load country holidays when component mounts and country is set */
  useEffect(() => {
    if (!data.country || data.holidays.some((h) => !h.custom)) return;

    let cancelled = false;

    async function loadHolidays(): Promise<void> {
      setLoadingHolidays(true);
      setLoadError(null);
      try {
        const result = await apiClient.get<readonly HolidayEntry[]>(
          `/holidays/public?country=${data.country}&year=${new Date().getFullYear()}`
        );
        if (cancelled) return;

        if (result.success && result.data) {
          const existing = new Set(data.holidays.filter((h) => !h.custom).map((h) => h.id));
          const newHolidays = result.data.filter((h) => !existing.has(h.id));
          if (newHolidays.length > 0) {
            onChange({
              holidays: [
                ...data.holidays,
                ...newHolidays.map((h) => ({ ...h, custom: false, enabled: true })),
              ],
            });
          }
        }
      } catch {
        if (!cancelled) {
          setLoadError("Could not load public holidays. You can add them manually.");
        }
      } finally {
        if (!cancelled) setLoadingHolidays(false);
      }
    }

    void loadHolidays();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.country]);

  function toggleHoliday(id: string): void {
    const updated = data.holidays.map((h) =>
      h.id === id ? { ...h, enabled: !h.enabled } : h
    );
    onChange({ holidays: updated });
  }

  function removeHoliday(id: string): void {
    onChange({ holidays: data.holidays.filter((h) => h.id !== id) });
  }

  function addCustomHoliday(): void {
    if (!customForm.name.trim()) {
      setFormError("Holiday name is required.");
      return;
    }
    if (!customForm.date) {
      setFormError("Date is required.");
      return;
    }
    const newHoliday: HolidayEntry = {
      id: generateId(),
      name: customForm.name.trim(),
      date: customForm.date,
      enabled: true,
      custom: true,
    };
    onChange({ holidays: [...data.holidays, newHoliday] });
    setCustomForm({ name: "", date: "" });
    setFormError(null);
  }

  const publicHolidays = data.holidays.filter((h) => !h.custom);
  const customHolidays = data.holidays.filter((h) => h.custom);
  const enabledCount = data.holidays.filter((h) => h.enabled).length;

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Configure holidays
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Public holidays are auto-loaded based on your country. Toggle
          individual days or add custom company holidays.
        </p>
      </div>

      {/* Loading */}
      {loadingHolidays && (
        <div className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
          <svg
            className="h-5 w-5 animate-spin text-accent-indigo"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
          <span className="text-sm text-text-secondary">
            Loading public holidays for {data.country}...
          </span>
        </div>
      )}

      {/* Load error */}
      {loadError && (
        <p className="rounded-xl border border-accent-amber/20 bg-accent-amber/5 px-4 py-3 text-sm text-accent-amber">
          {loadError}
        </p>
      )}

      {/* Summary */}
      {data.holidays.length > 0 && (
        <p className="font-mono text-xs text-text-tertiary">
          {enabledCount} of {data.holidays.length} holidays enabled
        </p>
      )}

      {/* Public holidays */}
      {publicHolidays.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            Public holidays
          </p>
          <div className="flex flex-col gap-1" role="list">
            {publicHolidays.map((holiday) => (
              <div
                key={holiday.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-400",
                  holiday.enabled
                    ? "border-white/8 bg-white/3"
                    : "border-white/4 bg-white/1 opacity-50"
                )}
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={holiday.enabled}
                  aria-label={`${holiday.enabled ? "Disable" : "Enable"} ${holiday.name}`}
                  onClick={() => toggleHoliday(holiday.id)}
                  className={cn(
                    "relative h-5 w-9 shrink-0 rounded-full border transition-all duration-400",
                    holiday.enabled
                      ? "border-accent-emerald/40 bg-accent-emerald/30"
                      : "border-white/15 bg-white/10"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-400",
                      holiday.enabled ? "translate-x-4" : "translate-x-0.5"
                    )}
                    aria-hidden="true"
                  />
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    {holiday.name}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-text-tertiary">
                    {formatDate(holiday.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom holidays */}
      {customHolidays.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">
            Custom holidays
          </p>
          <div className="flex flex-col gap-1" role="list">
            {customHolidays.map((holiday) => (
              <div
                key={holiday.id}
                role="listitem"
                className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/3 px-4 py-3"
              >
                <div className="h-2 w-2 shrink-0 rounded-full bg-accent-violet/60" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-text-primary">
                  {holiday.name}
                </span>
                <span className="font-mono text-xs text-text-tertiary">
                  {formatDate(holiday.date)}
                </span>
                <button
                  type="button"
                  onClick={() => removeHoliday(holiday.id)}
                  aria-label={`Remove ${holiday.name}`}
                  className="shrink-0 rounded-lg p-1.5 text-text-tertiary transition-colors duration-400 hover:bg-accent-rose/10 hover:text-accent-rose"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                    <path
                      d="M4 8h8"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add custom holiday */}
      <div className="flex flex-col gap-3 rounded-xl border border-white/8 bg-white/3 p-4">
        <p className="font-mono text-xs uppercase tracking-wider text-text-secondary">
          Add custom holiday
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={customForm.name}
            onChange={(e) =>
              setCustomForm((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Holiday name"
            aria-label="Custom holiday name"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
          />
          <input
            type="date"
            value={customForm.date}
            onChange={(e) =>
              setCustomForm((prev) => ({ ...prev, date: e.target.value }))
            }
            aria-label="Holiday date"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary focus:border-accent-indigo/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={addCustomHoliday}
            className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-semibold text-accent-indigo transition-all duration-400 hover:bg-accent-indigo/30"
          >
            Add
          </button>
        </div>
        {formError && (
          <p className="text-xs text-accent-rose" role="alert">
            {formError}
          </p>
        )}
      </div>

      {/* Empty state */}
      {!loadingHolidays && data.holidays.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-sm text-text-tertiary">
            No holidays loaded yet.
          </p>
          {!data.country && (
            <p className="font-mono text-xs text-text-tertiary">
              Set a country in Step 1 to auto-load public holidays.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
