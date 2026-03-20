"use client";

/**
 * useCalendar — fetches absences and coverage data for the absence calendar.
 *
 * Endpoints:
 *   GET /calendar/absences?month=YYYY-MM&teamId=...
 *   GET /calendar/coverage?month=YYYY-MM&teamId=...
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type AbsenceStatus =
  | "approved"
  | "pending_approval"
  | "rejected"
  | "cancelled";

export interface CalendarAbsence {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly teamId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly leaveType: string;
  readonly leaveTypeColor: string;
  readonly status: AbsenceStatus;
}

export interface CoverageWarning {
  readonly teamId: string;
  readonly date: string;
  readonly presentCount: number;
  readonly teamSize: number;
  readonly coveragePercent: number;
  readonly threshold: number;
}

export interface CalendarTeam {
  readonly teamId: string;
  readonly teamName: string;
  readonly employees: readonly {
    readonly id: string;
    readonly name: string;
    readonly initials: string;
  }[];
}

export interface CalendarData {
  readonly teams: readonly CalendarTeam[];
  readonly absences: readonly CalendarAbsence[];
  readonly coverageWarnings: readonly CoverageWarning[];
}

export interface CalendarState {
  readonly data: CalendarData | null;
  readonly loading: boolean;
  readonly error: string | null;
}

/* =========================================================================
   Hook
   ========================================================================= */

export interface UseCalendarReturn {
  readonly state: CalendarState;
  readonly refresh: () => void;
}

export function useCalendar(
  month: string,
  teamId: string | null
): UseCalendarReturn {
  const [state, setState] = useState<CalendarState>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchCalendar = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const teamParam = teamId ? `&teamId=${teamId}` : "";
    const query = `month=${encodeURIComponent(month)}${teamParam}`;

    try {
      const [absencesResult, coverageResult] = await Promise.all([
        apiClient.get<{
          teams: readonly CalendarTeam[];
          absences: readonly CalendarAbsence[];
        }>(`/calendar/absences?${query}`),
        apiClient.get<readonly CoverageWarning[]>(
          `/calendar/coverage?${query}`
        ),
      ]);

      if (!absencesResult.success) {
        setState({
          data: null,
          loading: false,
          error: absencesResult.error ?? "Failed to load absences.",
        });
        return;
      }

      setState({
        data: {
          teams: absencesResult.data?.teams ?? [],
          absences: absencesResult.data?.absences ?? [],
          coverageWarnings: coverageResult.success
            ? (coverageResult.data ?? [])
            : [],
        },
        loading: false,
        error: null,
      });
    } catch {
      setState({
        data: null,
        loading: false,
        error: "Failed to load calendar. Check your connection.",
      });
    }
  }, [month, teamId]);

  useEffect(() => {
    void fetchCalendar();
  }, [fetchCalendar]);

  return { state, refresh: () => void fetchCalendar() };
}
