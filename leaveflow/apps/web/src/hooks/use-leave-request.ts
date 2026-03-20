"use client";

/**
 * useLeaveRequest — fetch and mutate hooks for leave request detail.
 *
 * Fetches GET /requests/:id and exposes approve/reject/cancel/force-approve.
 */

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

/* =========================================================================
   Types
   ========================================================================= */

export type LeaveRequestStatus =
  | "pending_approval"
  | "approved"
  | "rejected"
  | "cancelled"
  | "auto_approved"
  | "pending_validation"
  | "validation_failed";

export type ApprovalStepStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "escalated"
  | "skipped";

export interface ApprovalStep {
  readonly stepNumber: number;
  readonly approverName: string;
  readonly approverRole: string;
  readonly approverInitials: string;
  readonly approverColor: string;
  readonly status: ApprovalStepStatus;
  readonly timestamp: string | null;
  readonly via: "web" | "slack" | "teams" | "api" | null;
  readonly comment: string | null;
}

export interface ImpactData {
  readonly balanceAfterApproval: number;
  readonly balanceTotal: number;
  readonly leaveTypeName: string;
  readonly teamMembersOutSameDates: readonly { name: string; initials: string; color: string }[];
  readonly holidaysOverlap: readonly { name: string; date: string }[];
  readonly workingDaysCount: number;
}

export interface AuditEntry {
  readonly id: string;
  readonly action: string;
  readonly actorName: string;
  readonly timestamp: string;
  readonly details: string | null;
}

export interface TimeoutInfo {
  readonly hoursRemaining: number;
  readonly minutesRemaining: number;
  readonly action: "remind" | "escalate" | "auto_approve" | "notify_hr";
}

export interface LeaveRequest {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeName: string;
  readonly employeeInitials: string;
  readonly employeeColor: string;
  readonly employeeTeam: string;
  readonly leaveType: string;
  readonly leaveTypeColor: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly reason: string | null;
  readonly status: LeaveRequestStatus;
  readonly submittedAt: string;
  readonly approvalSteps: readonly ApprovalStep[];
  readonly currentStep: number | null;
  readonly timeoutInfo: TimeoutInfo | null;
  readonly impact: ImpactData;
  readonly auditTrail: readonly AuditEntry[];
  readonly canApprove: boolean;
  readonly canReject: boolean;
  readonly canCancel: boolean;
  readonly canForceApprove: boolean;
}

export interface LeaveRequestState {
  readonly request: LeaveRequest | null;
  readonly loading: boolean;
  readonly error: string | null;
  readonly actionPending: boolean;
  readonly actionError: string | null;
}

/* =========================================================================
   Hook
   ========================================================================= */

export interface UseLeaveRequestReturn {
  readonly state: LeaveRequestState;
  readonly approve: (comment?: string) => Promise<void>;
  readonly reject: (reason: string) => Promise<void>;
  readonly cancel: () => Promise<void>;
  readonly forceApprove: (comment?: string) => Promise<void>;
  readonly refresh: () => void;
}

export function useLeaveRequest(requestId: string): UseLeaveRequestReturn {
  const [state, setState] = useState<LeaveRequestState>({
    request: null,
    loading: true,
    error: null,
    actionPending: false,
    actionError: null,
  });

  const fetchRequest = useCallback(async (): Promise<void> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiClient.get<LeaveRequest>(`/requests/${requestId}`);
      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          request: result.data,
          loading: false,
          error: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: result.error ?? "Request not found.",
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: "Failed to load request. Check your connection.",
      }));
    }
  }, [requestId]);

  useEffect(() => {
    void fetchRequest();
  }, [fetchRequest]);

  async function performAction(
    path: string,
    body?: unknown
  ): Promise<void> {
    setState((prev) => ({
      ...prev,
      actionPending: true,
      actionError: null,
    }));
    try {
      const result = await apiClient.post<LeaveRequest>(path, body);
      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          request: result.data,
          actionPending: false,
          actionError: null,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          actionPending: false,
          actionError: result.error ?? "Action failed.",
        }));
      }
    } catch {
      setState((prev) => ({
        ...prev,
        actionPending: false,
        actionError: "Action failed. Please try again.",
      }));
    }
  }

  const approve = useCallback(
    async (comment?: string): Promise<void> => {
      await performAction(`/requests/${requestId}/approve`, { comment });
    },
    [requestId]
  );

  const reject = useCallback(
    async (reason: string): Promise<void> => {
      await performAction(`/requests/${requestId}/reject`, { reason });
    },
    [requestId]
  );

  const cancel = useCallback(async (): Promise<void> => {
    await performAction(`/requests/${requestId}/cancel`);
  }, [requestId]);

  const forceApprove = useCallback(
    async (comment?: string): Promise<void> => {
      await performAction(`/requests/${requestId}/force-approve`, {
        comment,
      });
    },
    [requestId]
  );

  return {
    state,
    approve,
    reject,
    cancel,
    forceApprove,
    refresh: () => void fetchRequest(),
  };
}
