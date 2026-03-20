"use client";

/**
 * useLeaveTypes — CRUD hook for leave type configuration.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type AccrualType = "none" | "monthly" | "annual" | "per_pay_period";

export interface LeaveType {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly paid: boolean;
  readonly entitlementDays: number;
  readonly accrualType: AccrualType;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CreateLeaveTypeInput {
  readonly name: string;
  readonly color: string;
  readonly paid: boolean;
  readonly entitlementDays: number;
  readonly accrualType: AccrualType;
}

export type UpdateLeaveTypeInput = Partial<CreateLeaveTypeInput>;

/* =========================================================================
   Hook
   ========================================================================= */

interface UseLeaveTypesReturn {
  readonly leaveTypes: readonly LeaveType[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly create: (input: CreateLeaveTypeInput) => Promise<void>;
  readonly update: (id: string, input: UpdateLeaveTypeInput) => Promise<void>;
  readonly remove: (id: string) => Promise<void>;
  readonly refresh: () => void;
}

export function useLeaveTypes(): UseLeaveTypesReturn {
  const [leaveTypes, setLeaveTypes] = useState<readonly LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaveTypes = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiClient.get<LeaveType[]>("/api/leave-types");
      if (result.success && result.data) {
        setLeaveTypes(result.data);
      } else {
        setError(result.error ?? "Failed to load leave types");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load leave types");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaveTypes();
  }, [fetchLeaveTypes]);

  const create = useCallback(
    async (input: CreateLeaveTypeInput) => {
      const result = await apiClient.post<LeaveType>("/api/leave-types", input);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to create leave type");
      }
      await fetchLeaveTypes();
    },
    [fetchLeaveTypes]
  );

  const update = useCallback(
    async (id: string, input: UpdateLeaveTypeInput) => {
      const result = await apiClient.patch<LeaveType>(
        `/api/leave-types/${id}`,
        input
      );
      if (!result.success) {
        throw new Error(result.error ?? "Failed to update leave type");
      }
      setLeaveTypes((prev) =>
        prev.map((lt) =>
          lt.id === id ? { ...lt, ...result.data } : lt
        )
      );
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await apiClient.delete<void>(`/api/leave-types/${id}`);
      if (!result.success) {
        throw new Error(result.error ?? "Failed to delete leave type");
      }
      setLeaveTypes((prev) => prev.filter((lt) => lt.id !== id));
    },
    []
  );

  return {
    leaveTypes,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: fetchLeaveTypes,
  };
}
