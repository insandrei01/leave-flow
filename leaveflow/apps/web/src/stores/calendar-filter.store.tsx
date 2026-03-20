"use client";

/**
 * Calendar filter store — Zustand-style state using React state + context.
 *
 * Note: Zustand is not available in this project. This module provides the
 * same interface using a simple module-level signal pattern with React hooks.
 *
 * Manages: selectedMonth, selectedTeamId, viewMode
 */

import { useState, useCallback, createContext, useContext, useMemo } from "react";

/* =========================================================================
   Types
   ========================================================================= */

export type CalendarViewMode = "month" | "week";

export interface CalendarFilterState {
  readonly selectedMonth: string; // ISO format: YYYY-MM
  readonly selectedTeamId: string | null;
  readonly viewMode: CalendarViewMode;
  readonly searchQuery: string;
}

export interface CalendarFilterActions {
  readonly setMonth: (month: string) => void;
  readonly setTeamId: (teamId: string | null) => void;
  readonly setViewMode: (mode: CalendarViewMode) => void;
  readonly setSearchQuery: (query: string) => void;
  readonly goToPreviousMonth: () => void;
  readonly goToNextMonth: () => void;
  readonly goToCurrentMonth: () => void;
}

export type CalendarFilterStore = CalendarFilterState & CalendarFilterActions;

/* =========================================================================
   Helpers
   ========================================================================= */

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(month: string, delta: number): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const m = Number(monthStr) - 1 + delta;
  const date = new Date(year, m, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/* =========================================================================
   Context
   ========================================================================= */

const CalendarFilterContext = createContext<CalendarFilterStore | null>(null);

/* =========================================================================
   Provider
   ========================================================================= */

interface CalendarFilterProviderProps {
  readonly children: React.ReactNode;
  readonly initialMonth?: string;
}

export function CalendarFilterProvider({
  children,
  initialMonth,
}: CalendarFilterProviderProps): React.ReactElement {
  const [state, setState] = useState<CalendarFilterState>({
    selectedMonth: initialMonth ?? getCurrentMonth(),
    selectedTeamId: null,
    viewMode: "month",
    searchQuery: "",
  });

  const setMonth = useCallback((month: string) => {
    setState((prev) => ({ ...prev, selectedMonth: month }));
  }, []);

  const setTeamId = useCallback((teamId: string | null) => {
    setState((prev) => ({ ...prev, selectedTeamId: teamId }));
  }, []);

  const setViewMode = useCallback((mode: CalendarViewMode) => {
    setState((prev) => ({ ...prev, viewMode: mode }));
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const goToPreviousMonth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedMonth: shiftMonth(prev.selectedMonth, -1),
    }));
  }, []);

  const goToNextMonth = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedMonth: shiftMonth(prev.selectedMonth, 1),
    }));
  }, []);

  const goToCurrentMonth = useCallback(() => {
    setState((prev) => ({ ...prev, selectedMonth: getCurrentMonth() }));
  }, []);

  const store = useMemo<CalendarFilterStore>(
    () => ({
      ...state,
      setMonth,
      setTeamId,
      setViewMode,
      setSearchQuery,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
    }),
    [
      state,
      setMonth,
      setTeamId,
      setViewMode,
      setSearchQuery,
      goToPreviousMonth,
      goToNextMonth,
      goToCurrentMonth,
    ]
  );

  return (
    <CalendarFilterContext.Provider value={store}>
      {children}
    </CalendarFilterContext.Provider>
  );
}

/* =========================================================================
   Hook
   ========================================================================= */

export function useCalendarFilter(): CalendarFilterStore {
  const ctx = useContext(CalendarFilterContext);
  if (!ctx) {
    throw new Error(
      "useCalendarFilter must be used within a CalendarFilterProvider"
    );
  }
  return ctx;
}
