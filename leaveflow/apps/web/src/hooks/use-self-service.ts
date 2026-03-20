"use client";

/**
 * Self-service hooks — balance, leave requests, and team calendar
 * for the employee self-service page.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export interface LeaveBalance {
  readonly leaveTypeId: string;
  readonly leaveTypeName: string;
  readonly color: string;
  readonly totalDays: number;
  readonly usedDays: number;
  readonly remainingDays: number;
  readonly pendingDays: number;
}

export interface ApprovalStep {
  readonly stepNumber: number;
  readonly approverLabel: string;
  readonly status: "completed" | "active" | "upcoming" | "skipped";
  readonly completedAt?: string;
}

export interface LeaveRequest {
  readonly id: string;
  readonly leaveTypeName: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly status:
    | "pending_approval"
    | "approved"
    | "rejected"
    | "cancelled"
    | "pending_validation";
  readonly reason: string;
  readonly submittedAt: string;
  readonly approvalSteps: readonly ApprovalStep[];
}

export interface TeamCalendarEntry {
  readonly employeeId: string;
  readonly employeeName: string;
  readonly avatarInitials: string;
  readonly avatarColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly leaveTypeName: string;
  readonly status: "approved" | "pending_approval";
}

export interface Holiday {
  readonly id: string;
  readonly name: string;
  readonly date: string;
  readonly daysUntil: number;
}

export interface CreateLeaveRequestPayload {
  readonly leaveTypeId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly halfDay: boolean;
  readonly halfDayPeriod?: "morning" | "afternoon";
  readonly reason: string;
}

export interface ValidateLeaveRequestPayload extends CreateLeaveRequestPayload {
  readonly requestId?: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly workingDays: number;
  readonly balanceAfter: number;
  readonly warnings: readonly string[];
  readonly errors: readonly string[];
}

/* =========================================================================
   useLeaveBalances
   ========================================================================= */

export interface UseLeaveBalancesResult {
  readonly balances: readonly LeaveBalance[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useLeaveBalances(): UseLeaveBalancesResult {
  const [balances, setBalances] = useState<readonly LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly LeaveBalance[]>(
          "/me/balances"
        );

        if (cancelled) return;

        if (result.success) {
          setBalances(result.data);
        } else {
          setError(result.error ?? "Failed to load balances");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unexpected error loading balances"
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
  return { balances, isLoading, error, refetch };
}

/* =========================================================================
   useMyLeaveRequests
   ========================================================================= */

export interface UseMyLeaveRequestsResult {
  readonly requests: readonly LeaveRequest[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => void;
}

export function useMyLeaveRequests(): UseMyLeaveRequestsResult {
  const [requests, setRequests] = useState<readonly LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly LeaveRequest[]>(
          "/me/leave-requests"
        );

        if (cancelled) return;

        if (result.success) {
          setRequests(result.data);
        } else {
          setError(result.error ?? "Failed to load requests");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unexpected error loading requests"
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
  return { requests, isLoading, error, refetch };
}

/* =========================================================================
   useTeamCalendar
   ========================================================================= */

export interface UseTeamCalendarResult {
  readonly entries: readonly TeamCalendarEntry[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useTeamCalendar(): UseTeamCalendarResult {
  const [entries, setEntries] = useState<readonly TeamCalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly TeamCalendarEntry[]>(
          "/me/team-calendar"
        );

        if (cancelled) return;

        if (result.success) {
          setEntries(result.data);
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

  return { entries, isLoading, error };
}

/* =========================================================================
   useUpcomingHolidays
   ========================================================================= */

export interface UseUpcomingHolidaysResult {
  readonly holidays: readonly Holiday[];
  readonly isLoading: boolean;
  readonly error: string | null;
}

export function useUpcomingHolidays(): UseUpcomingHolidaysResult {
  const [holidays, setHolidays] = useState<readonly Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiClient.get<readonly Holiday[]>(
          "/me/upcoming-holidays?limit=3"
        );

        if (cancelled) return;

        if (result.success) {
          setHolidays(result.data);
        } else {
          setError(result.error ?? "Failed to load holidays");
        }
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Unexpected error loading holidays"
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

  return { holidays, isLoading, error };
}

/* =========================================================================
   useCreateLeaveRequest
   ========================================================================= */

export interface UseCreateLeaveRequestResult {
  readonly submit: (payload: CreateLeaveRequestPayload) => Promise<LeaveRequest | null>;
  readonly isSubmitting: boolean;
  readonly error: string | null;
}

export function useCreateLeaveRequest(): UseCreateLeaveRequestResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: CreateLeaveRequestPayload): Promise<LeaveRequest | null> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await apiClient.post<LeaveRequest>(
          "/leave-requests",
          payload
        );

        if (result.success) return result.data;

        setError(result.error ?? "Failed to submit request");
        return null;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected error submitting request";
        setError(message);
        return null;
      } finally {
        setIsSubmitting(false);
      }
    },
    []
  );

  return { submit, isSubmitting, error };
}

/* =========================================================================
   useValidateLeaveRequest
   ========================================================================= */

export interface UseValidateLeaveRequestResult {
  readonly validate: (
    payload: ValidateLeaveRequestPayload
  ) => Promise<ValidationResult | null>;
  readonly isValidating: boolean;
  readonly validationResult: ValidationResult | null;
}

export function useValidateLeaveRequest(): UseValidateLeaveRequestResult {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);

  const validate = useCallback(
    async (
      payload: ValidateLeaveRequestPayload
    ): Promise<ValidationResult | null> => {
      setIsValidating(true);

      try {
        const result = await apiClient.post<ValidationResult>(
          "/leave-requests/validate",
          payload
        );

        if (result.success) {
          setValidationResult(result.data);
          return result.data;
        }

        return null;
      } catch {
        return null;
      } finally {
        setIsValidating(false);
      }
    },
    []
  );

  return { validate, isValidating, validationResult };
}
