"use client";

/**
 * useRequests — hook for fetching and filtering leave requests.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient, type PaginationMeta } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type RequestStatus =
  | "pending_approval"
  | "pending_validation"
  | "approved"
  | "auto_approved"
  | "rejected"
  | "cancelled"
  | "validation_failed";

export interface LeaveRequest {
  readonly id: string;
  readonly status: RequestStatus;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly submittedAt: string;
  readonly note: string | null;
}

export interface RequestFilters {
  readonly statuses?: readonly RequestStatus[];
  readonly employeeId?: string;
  readonly teamId?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

/* =========================================================================
   Hook
   ========================================================================= */

interface UseRequestsReturn {
  readonly requests: readonly LeaveRequest[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly meta: PaginationMeta | null;
  readonly filters: RequestFilters;
  readonly setFilters: (filters: RequestFilters) => void;
  readonly page: number;
  readonly setPage: (page: number) => void;
  readonly refresh: () => void;
}

const PAGE_SIZE = 20;

export function useRequests(): UseRequestsReturn {
  const [requests, setRequests] = useState<readonly LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [filters, setFilters] = useState<RequestFilters>({});
  const [page, setPage] = useState(1);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort: "submittedAt:desc",
      });

      if (filters.statuses?.length) {
        filters.statuses.forEach((s) => params.append("status", s));
      }
      if (filters.employeeId) params.set("employeeId", filters.employeeId);
      if (filters.teamId) params.set("teamId", filters.teamId);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const result = await apiClient.get<LeaveRequest[]>(
        `/api/leave-requests?${params.toString()}`
      );
      if (result.success && result.data) {
        setRequests(result.data);
        setMeta(result.meta ?? null);
      } else {
        setError(result.error ?? "Failed to load requests");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const handleSetFilters = useCallback((newFilters: RequestFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  return {
    requests,
    isLoading,
    error,
    meta,
    filters,
    setFilters: handleSetFilters,
    page,
    setPage,
    refresh: fetchRequests,
  };
}
