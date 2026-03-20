/**
 * Type definitions for the approval engine module.
 */

import type mongoose from "mongoose";
import type { ApprovalActionType, ApprovalChannel } from "../../models/leave-request.model.js";
import type { LeaveRequestStatus } from "../../models/leave-request.model.js";

// ----------------------------------------------------------------
// FSM types
// ----------------------------------------------------------------

/**
 * Actions that drive FSM transitions in the approval engine.
 * These map to handler method calls — not directly to ApprovalActionType.
 */
export type ApprovalEngineAction =
  | "validation_passed"
  | "validation_failed"
  | "approve"
  | "reject"
  | "cancel"
  | "auto_approve"
  | "escalate";

export interface FsmTransition {
  from: LeaveRequestStatus;
  action: ApprovalEngineAction;
  to: LeaveRequestStatus;
}

// ----------------------------------------------------------------
// Input types for service methods
// ----------------------------------------------------------------

export interface ProcessApprovalInput {
  approverId: mongoose.Types.ObjectId;
  approverName: string;
  approverRole: string;
  via: ApprovalChannel;
  action: ApprovalActionType;
  reason?: string | null;
}

export interface ProcessRejectionInput {
  approverId: mongoose.Types.ObjectId;
  approverName: string;
  approverRole: string;
  via: ApprovalChannel;
  reason: string;
}

export interface ProcessEscalationInput {
  triggeredBy?: "timeout" | "manual";
}

export interface ProcessCancellationInput {
  employeeId: mongoose.Types.ObjectId;
  reason?: string | null;
}

// ----------------------------------------------------------------
// Result types
// ----------------------------------------------------------------

export interface ApprovalResult {
  leaveRequestId: mongoose.Types.ObjectId;
  previousStatus: LeaveRequestStatus;
  newStatus: LeaveRequestStatus;
  stepAdvanced: boolean;
  isTerminal: boolean;
}
