"use client";

/**
 * Team view hooks — data for the manager team view page.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type EmployeeStatus = "in-office" | "on-leave" | "upcoming-leave";

export interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly avatarInitials: string;
  readonly avatarColor: string;
  readonly status: EmployeeStatus;
  readonly leaveTypeName?: string;
  readonly leaveEndDate?: string;
}

export interface PendingApprovalItem {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly employeeAvatarInitials: string;
  readonly employeeAvatarColor: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly reason: string;
  readonly submittedAt: string;
  readonly approvalSteps: readonly {
    readonly stepNumber: number;
    readonly approverLabel: string;
    readonly status: "completed" | "active" | "upcoming";
  }[];
}

export interface TeamCalendarDay {
  readonly date: string;
  readonly absences: readonly {
    readonly employeeId: string;
    readonly employeeName: string;
    readonly avatarInitials: string;
    readonly avatarColor: string;
    readonly leaveTypeName: string;
    readonly status: "approved" | "pending_approval";
  }[];
}

export interface TeamBalanceSummary {
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly averageRemainingDays: number;
  readonly totalDays: number;
}

/* =========================================================================
   useTeamMembers
   ========================================================================= */

export interface UseTeamMembersResult {
  readonly members: readonly TeamMember[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useTeamMembers(): UseTeamMembersResult {
  const [members, setMembers] = useState<readonly TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly TeamMember[]>(
          "/manager/team/members"
        );

        if (cancelled) return;

        if (result.success) {
          setMembers(result.data);
        } else {
          setError(result.error ?? "Failed to load team members");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unexpected error loading team members"
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);
  return { members, isLoading, error, refetch };
}

/* =========================================================================
   useManagerPendingApprovals
   ========================================================================= */

export interface UseManagerPendingApprovalsResult {
  readonly approvals: readonly PendingApprovalItem[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
  readonly approve: (id: string) => Promise<boolean>;
  readonly reject: (id: string, reason: string) => Promise<boolean>;
  readonly isActing: boolean;
}

export function useManagerPendingApprovals(): UseManagerPendingApprovalsResult {
  const [approvals, setApprovals] = useState<readonly PendingApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly PendingApprovalItem[]>(
          "/manager/pending-approvals"
        );

        if (cancelled) return;

        if (result.success) {
          setApprovals(result.data);
        } else {
          setError(result.error ?? "Failed to load pending approvals");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error loading pending approvals"
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, [version]);

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  const approve = useCallback(
    async (id: string): Promise<boolean> => {
      setIsActing(true);

      try {
        const result = await apiClient.post(`/leave-requests/${id}/approve`);
        if (result.success) {
          refetch();
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [refetch]
  );

  const reject = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      setIsActing(true);

      try {
        const result = await apiClient.post(`/leave-requests/${id}/reject`, {
          reason,
        });
        if (result.success) {
          refetch();
          return true;
        }
        return false;
      } catch {
        return false;
      } finally {
        setIsActing(false);
      }
    },
    [refetch]
  );

  return { approvals, isLoading, error, refetch, approve, reject, isActing };
}

/* =========================================================================
   useTeamCalendarWeek
   ========================================================================= */

export interface UseTeamCalendarWeekResult {
  readonly days: readonly TeamCalendarDay[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useTeamCalendarWeek(): UseTeamCalendarWeekResult {
  const [days, setDays] = useState<readonly TeamCalendarDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly TeamCalendarDay[]>(
          "/manager/team/calendar?view=week"
        );

        if (cancelled) return;

        if (result.success) {
          setDays(result.data);
        } else {
          setError(result.error ?? "Failed to load team calendar");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error loading team calendar"
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  return { days, isLoading, error };
}

/* =========================================================================
   useTeamBalanceSummary
   ========================================================================= */

export interface UseTeamBalanceSummaryResult {
  readonly summaries: readonly TeamBalanceSummary[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useTeamBalanceSummary(): UseTeamBalanceSummaryResult {
  const [summaries, setSummaries] = useState<readonly TeamBalanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly TeamBalanceSummary[]>(
          "/manager/team/balance-summary"
        );

        if (cancelled) return;

        if (result.success) {
          setSummaries(result.data);
        } else {
          setError(result.error ?? "Failed to load team balance summary");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unexpected error loading balance summary"
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetch();
    return () => {
      cancelled = true;
    };
  }, []);

  return { summaries, isLoading, error };
}
