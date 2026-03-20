/**
 * LeaveRequest entity types — the core transactional entity with FSM lifecycle.
 * All 7 FSM states are represented as a string literal union.
 */

import type { WorkflowStep } from './workflow.types.js';

export type LeaveRequestStatus =
  | 'pending_validation'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'auto_approved'
  | 'validation_failed';

export type ApprovalAction =
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'skipped'
  | 'force_approved'
  | 'force_rejected';

export type ApprovalVia = 'slack' | 'teams' | 'web' | 'system' | 'email';

export interface ApprovalHistoryEntry {
  readonly step: number;
  readonly action: ApprovalAction;
  readonly actorId: string;
  readonly actorName: string;
  readonly actorRole: string;
  readonly delegatedFromId: string | null;
  readonly reason: string | null;
  readonly via: ApprovalVia;
  readonly timestamp: string;
}

export interface WorkflowSnapshot {
  readonly workflowId: string;
  readonly workflowVersion: number;
  readonly name: string;
  readonly steps: readonly WorkflowStep[];
}

export interface CalendarEventIds {
  readonly google: string | null;
  readonly outlook: string | null;
}

export interface LeaveRequest {
  readonly _id: string;
  readonly tenantId: string;
  readonly employeeId: string;
  readonly leaveTypeId: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly halfDayStart: boolean;
  readonly halfDayEnd: boolean;
  readonly workingDays: number;
  readonly reason: string | null;
  readonly status: LeaveRequestStatus;
  readonly currentStep: number;
  readonly reminderCount: number;
  readonly currentApproverEmployeeId: string | null;
  readonly currentStepStartedAt: string | null;
  readonly workflowSnapshot: WorkflowSnapshot;
  readonly autoApprovalRuleName: string | null;
  readonly approvalHistory: readonly ApprovalHistoryEntry[];
  readonly cancellationReason: string | null;
  readonly cancelledAt: string | null;
  readonly cancelledBy: string | null;
  readonly calendarEventIds: CalendarEventIds;
  readonly createdAt: string;
  readonly updatedAt: string;
}
