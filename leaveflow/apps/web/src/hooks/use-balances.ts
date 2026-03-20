"use client";

/**
 * useBalances — hook for fetching and exporting balance data.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export interface LeaveTypeBalance {
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly used: number;
  readonly total: number;
  readonly remaining: number;
}

export interface EmployeeBalance {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly teamId: string;
  readonly teamName: string;
  readonly balances: readonly LeaveTypeBalance[];
}

export interface BalanceFilters {
  readonly teamId?: string;
}

/* =========================================================================
   Hook
   ========================================================================= */

interface UseBalancesReturn {
  readonly balances: readonly EmployeeBalance[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly filters: BalanceFilters;
  readonly setFilters: (filters: BalanceFilters) => void;
  readonly exportCsv: () => void;
  readonly refresh: () => void;
}

export function useBalances(): UseBalancesReturn {
  const [balances, setBalances] = useState<readonly EmployeeBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<BalanceFilters>({});

  const fetchBalances = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.teamId) params.set("teamId", filters.teamId);
      const query = params.toString() ? `?${params.toString()}` : "";
      const result = await apiClient.get<EmployeeBalance[]>(
        `/api/balances${query}`
      );
      if (result.success && result.data) {
        setBalances(result.data);
      } else {
        setError(result.error ?? "Failed to load balances");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load balances");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void fetchBalances();
  }, [fetchBalances]);

  const exportCsv = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.teamId) params.set("teamId", filters.teamId);
    const query = params.toString() ? `?${params.toString()}` : "";
    const apiBase =
      process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
    window.open(`${apiBase}/api/balances/export${query}`, "_blank");
  }, [filters]);

  return {
    balances,
    isLoading,
    error,
    filters,
    setFilters,
    exportCsv,
    refresh: fetchBalances,
  };
}
