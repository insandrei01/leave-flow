"use client";

/**
 * Absence Calendar page — swim-lane Gantt with month/week toggle, team filter, search.
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCalendar } from "@/hooks/use-calendar";
import {
  CalendarFilterProvider,
  useCalendarFilter,
} from "@/stores/calendar-filter.store";
import { SwimLaneGrid } from "@/components/calendar/swim-lane-grid";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/* =========================================================================
   Inner page (consumes CalendarFilterProvider context)
   ========================================================================= */

function CalendarPageInner(): React.ReactElement {
  const router = useRouter();
  const filter = useCalendarFilter();
  const { state } = useCalendar(filter.selectedMonth, filter.selectedTeamId);

  const [yearStr, monthStr] = filter.selectedMonth.split("-");
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    1
  ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  function handleAbsenceClick(absenceId: string): void {
    router.push(`/requests/${absenceId}`);
  }

  const teams = state.data?.teams ?? [];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-6 pb-0">
        <PageHeader
          title="Absence Calendar"
          subtitle={`${monthLabel} — team overview`}
        />

        {/* Controls bar */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* Month navigation */}
          <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={filter.goToPreviousMonth}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors duration-400 hover:bg-white/10 hover:text-text-primary"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={filter.goToCurrentMonth}
              className="px-3 font-mono text-xs font-semibold text-text-primary"
            >
              {monthLabel}
            </button>
            <button
              type="button"
              onClick={filter.goToNextMonth}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-text-secondary transition-colors duration-400 hover:bg-white/10 hover:text-text-primary"
            >
              <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>

          {/* View toggle */}
          <div
            className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1"
            role="radiogroup"
            aria-label="Calendar view mode"
          >
            {(["month", "week"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={filter.viewMode === mode}
                onClick={() => filter.setViewMode(mode)}
                className={cn(
                  "rounded-lg px-3 py-1.5 font-mono text-xs capitalize transition-all duration-400",
                  filter.viewMode === mode
                    ? "bg-accent-indigo/20 text-accent-indigo"
                    : "text-text-tertiary hover:text-text-secondary"
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Team filter */}
          {teams.length > 0 && (
            <select
              value={filter.selectedTeamId ?? ""}
              onChange={(e) => filter.setTeamId(e.target.value || null)}
              aria-label="Filter by team"
              className="rounded-xl border border-white/10 bg-surface-overlay px-3 py-2 font-mono text-xs text-text-primary transition-colors focus:border-accent-indigo/60 focus:outline-none"
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.teamId} value={t.teamId}>
                  {t.teamName}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative ml-auto">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={filter.searchQuery}
              onChange={(e) => filter.setSearchQuery(e.target.value)}
              placeholder="Search employee..."
              aria-label="Search employees"
              className="rounded-xl border border-white/10 bg-white/5 py-2 pl-8 pr-4 font-mono text-xs text-text-primary placeholder-text-tertiary focus:border-accent-indigo/60 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Calendar body */}
      <div className="flex-1 overflow-hidden p-6 pt-4">
        {state.loading ? (
          <div
            className="flex h-full flex-col gap-3 animate-fade-in"
            aria-busy="true"
            aria-label="Loading calendar"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="shimmer h-12 rounded-xl" />
            ))}
          </div>
        ) : state.error ? (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent-rose/20 bg-accent-rose/5 p-10 text-center">
            <p className="text-sm text-accent-rose">{state.error}</p>
          </div>
        ) : (
          <SwimLaneGrid
            data={state.data!}
            month={filter.selectedMonth}
            onAbsenceClick={handleAbsenceClick}
          />
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   Page with provider
   ========================================================================= */

export default function CalendarPage(): React.ReactElement {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const initialMonth = dateParam
    ? dateParam.slice(0, 7)
    : undefined;

  return (
    <CalendarFilterProvider initialMonth={initialMonth}>
      <CalendarPageInner />
    </CalendarFilterProvider>
  );
}
