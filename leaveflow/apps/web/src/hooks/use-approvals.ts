"use client";

/**
 * Approvals hooks — pending approval list with approve/reject mutations
 * for the HR admin approvals page.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export interface PendingApproval {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly employeeAvatarInitials: string;
  readonly employeeAvatarColor: string;
  readonly teamName: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly submittedAt: string;
  /** Age in hours since submission */
  readonly ageHours: number;
}

export type SortField = "age" | "startDate" | "employeeName";
export type SortDirection = "asc" | "desc";

export interface ApprovalsFilter {
  readonly teamId?: string;
  readonly sortField: SortField;
  readonly sortDirection: SortDirection;
}

/* =========================================================================
   usePendingApprovals
   ========================================================================= */

export interface UsePendingApprovalsResult {
  readonly approvals: readonly PendingApproval[];
  readonly filteredApprovals: readonly PendingApproval[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly filter: ApprovalsFilter;
  readonly setFilter: (filter: Partial<ApprovalsFilter>) => void;
  readonly refetch: () => void;
}

const DEFAULT_FILTER: ApprovalsFilter = {
  sortField: "age",
  sortDirection: "desc",
};

function sortApprovals(
  approvals: readonly PendingApproval[],
  filter: ApprovalsFilter
): readonly PendingApproval[] {
  const copy = [...approvals];
  copy.sort((a, b) => {
    let comparison = 0;

    if (filter.sortField === "age") {
      comparison = a.ageHours - b.ageHours;
    } else if (filter.sortField === "startDate") {
      comparison =
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
    } else if (filter.sortField === "employeeName") {
      comparison = a.employeeName.localeCompare(b.employeeName);
    }

    return filter.sortDirection === "desc" ? -comparison : comparison;
  });
  return copy;
}

export function usePendingApprovals(): UsePendingApprovalsResult {
  const [approvals, setApprovals] = useState<readonly PendingApproval[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<ApprovalsFilter>(DEFAULT_FILTER);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly PendingApproval[]>(
          "/approvals/pending"
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

  const setFilter = useCallback(
    (patch: Partial<ApprovalsFilter>) => {
      setFilterState((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const filteredApprovals = useCallback(() => {
    let filtered: readonly PendingApproval[] = approvals;

    if (filter.teamId) {
      filtered = filtered.filter((a) => {
        // Team filtering requires teamId on the approval — handled server-side
        // via query param in production; for now filter client-side by teamName match
        return (a as PendingApproval & { teamId?: string }).teamId === filter.teamId;
      });
    }

    return sortApprovals(filtered, filter);
  }, [approvals, filter])();

  return {
    approvals,
    filteredApprovals,
    isLoading,
    error,
    filter,
    setFilter,
    refetch,
  };
}

/* =========================================================================
   useApproveRequest
   ========================================================================= */

export interface UseApproveRequestResult {
  readonly approve: (id: string) => Promise<boolean>;
  readonly isApproving: boolean;
  readonly error: string | null;
}

export function useApproveRequest(
  onSuccess?: (id: string) => void
): UseApproveRequestResult {
  const [isApproving, setIsApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = useCallback(
    async (id: string): Promise<boolean> => {
      setIsApproving(true);
      setError(null);

      try {
        const result = await apiClient.post(`/leave-requests/${id}/approve`);

        if (result.success) {
          onSuccess?.(id);
          return true;
        }

        setError(result.error ?? "Failed to approve request");
        return false;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error approving request";
        setError(message);
        return false;
      } finally {
        setIsApproving(false);
      }
    },
    [onSuccess]
  );

  return { approve, isApproving, error };
}

/* =========================================================================
   useRejectRequest
   ========================================================================= */

export interface UseRejectRequestResult {
  readonly reject: (id: string, reason: string) => Promise<boolean>;
  readonly isRejecting: boolean;
  readonly error: string | null;
}

export function useRejectRequest(
  onSuccess?: (id: string) => void
): UseRejectRequestResult {
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reject = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      if (reason.length < 10) {
        setError("Rejection reason must be at least 10 characters");
        return false;
      }

      setIsRejecting(true);
      setError(null);

      try {
        const result = await apiClient.post(`/leave-requests/${id}/reject`, {
          reason,
        });

        if (result.success) {
          onSuccess?.(id);
          return true;
        }

        setError(result.error ?? "Failed to reject request");
        return false;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error rejecting request";
        setError(message);
        return false;
      } finally {
        setIsRejecting(false);
      }
    },
    [onSuccess]
  );

  return { reject, isRejecting, error };
}

/* =========================================================================
   useBatchApprove
   ========================================================================= */

export interface UseBatchApproveResult {
  readonly batchApprove: (ids: readonly string[]) => Promise<number>;
  readonly isBatchApproving: boolean;
  readonly error: string | null;
}

export function useBatchApprove(
  onSuccess?: (ids: readonly string[]) => void
): UseBatchApproveResult {
  const [isBatchApproving, setIsBatchApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const batchApprove = useCallback(
    async (ids: readonly string[]): Promise<number> => {
      if (ids.length === 0) return 0;

      setIsBatchApproving(true);
      setError(null);

      try {
        const result = await apiClient.post<{ readonly approved: number }>(
          "/leave-requests/batch-approve",
          { ids }
        );

        if (result.success) {
          onSuccess?.(ids);
          return result.data.approved;
        }

        setError(result.error ?? "Failed to batch approve requests");
        return 0;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unexpected error in batch approval";
        setError(message);
        return 0;
      } finally {
        setIsBatchApproving(false);
      }
    },
    [onSuccess]
  );

  return { batchApprove, isBatchApproving, error };
}
