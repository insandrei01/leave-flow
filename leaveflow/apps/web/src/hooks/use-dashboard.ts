"use client";

/**
 * useDashboard — fetches the dashboard summary with a refresh interval.
 *
 * Polls GET /dashboard/summary every 60 seconds for real-time widgets.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export interface EmployeeAvatar {
  readonly id: string;
  readonly name: string;
  readonly initials: string;
  readonly color: string;
}

export interface OutTodayData {
  readonly count: number;
  readonly employees: readonly EmployeeAvatar[];
}

export interface PendingApprovalsData {
  readonly count: number;
  readonly staleCount: number;
}

export interface UtilizationData {
  readonly percentage: number;
  readonly trend: number;
}

export interface UpcomingDayData {
  readonly date: string;
  readonly dayLabel: string;
  readonly count: number;
}

export interface HeatmapDayData {
  readonly date: string;
  readonly count: number;
  readonly isToday: boolean;
}

export interface ResolutionData {
  readonly approved: number;
  readonly pending: number;
  readonly rejected: number;
  readonly total: number;
}

export interface ActivityEvent {
  readonly id: string;
  readonly type:
    | "approved"
    | "rejected"
    | "submitted"
    | "cancelled"
    | "policy_changed"
    | "escalated";
  readonly message: string;
  readonly timestamp: string;
  readonly actorName: string;
}

export interface PendingRequest {
  readonly id: string;
  readonly employeeName: string;
  readonly initials: string;
  readonly leaveType: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly submittedAt: string;
  readonly hoursWaiting: number;
}

export interface TeamBalance {
  readonly teamId: string;
  readonly teamName: string;
  readonly leaveTypes: readonly {
    readonly name: string;
    readonly color: string;
    readonly averageRemaining: number;
    readonly total: number;
  }[];
}

export interface DashboardSummary {
  readonly outToday: OutTodayData;
  readonly pendingApprovals: PendingApprovalsData;
  readonly utilization: UtilizationData;
  readonly upcomingWeek: readonly UpcomingDayData[];
  readonly heatmap: readonly HeatmapDayData[];
  readonly resolution: ResolutionData;
  readonly recentActivity: readonly ActivityEvent[];
  readonly needsAttention: readonly PendingRequest[];
  readonly teamBalances: readonly TeamBalance[];
}

export interface DashboardState {
  readonly data: DashboardSummary | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly lastUpdated: Date | null;
}

const REFRESH_INTERVAL_MS = 60_000;

/* =========================================================================
   Hook
   ========================================================================= */

export interface UseDashboardReturn {
  readonly state: DashboardState;
  readonly refresh: () => void;
}

export function useDashboard(): UseDashboardReturn {
  const [state, setState] = useState<DashboardState>({
    data: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchDashboard = useCallback(async (): Promise<void> => {
    try {
      const result = await apiClient.get<DashboardSummary>("/dashboard/summary");
      if (result.success && result.data) {
        setState({
          data: result.data,
          loading: false,
          error: null,
          lastUpdated: new Date(),
        });
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: result.error ?? "Failed to load dashboard.",
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load dashboard. Check your connection.",
      }));
    }
  }, []);

  /* Initial fetch */
  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  /* Refresh interval */
  useEffect(() => {
    const interval = setInterval(() => void fetchDashboard(), REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  return { state, refresh: () => void fetchDashboard() };
}
