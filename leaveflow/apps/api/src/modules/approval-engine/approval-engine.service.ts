/**
 * Approval engine service — orchestrates leave request state transitions.
 *
 * Every status change:
 * 1. Loads the leave request
 * 2. Validates transition via FSM
 * 3. Appends to approvalHistory
 * 4. Calls balance service (deduct on approve, restore on cancel-approved)
 * 5. Persists the updated document
 * 6. Writes an audit log entry (same call — never async/fire-and-forget)
 */

import mongoose from "mongoose";
import { transition } from "./approval-engine.fsm.js";
import type { ILeaveRequest } from "../../models/leave-request.model.js";
import type {
  ProcessApprovalInput,
  ProcessRejectionInput,
  ProcessEscalationInput,
  ProcessCancellationInput,
  ApprovalResult,
} from "./approval-engine.types.js";

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface ILeaveRequestRepository {
  findById(
    tenantId: string,
    id: mongoose.Types.ObjectId
  ): Promise<ILeaveRequest | null>;
  updateStatus(
    tenantId: string,
    id: mongoose.Types.ObjectId,
    update: LeaveRequestUpdate
  ): Promise<void>;
}

export interface LeaveRequestUpdate {
  status?: ILeaveRequest["status"];
  currentStep?: number;
  reminderCount?: number;
  currentApproverEmployeeId?: mongoose.Types.ObjectId | null;
  currentStepStartedAt?: Date | null;
  approvalHistory?: ILeaveRequest["approvalHistory"];
  autoApprovalRuleName?: string | null;
  cancellationReason?: string | null;
  cancelledAt?: Date | null;
  cancelledBy?: mongoose.Types.ObjectId | null;
}

export interface IBalanceServiceDep {
  deduct(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    leaveRequestId: mongoose.Types.ObjectId | string,
    input: { amount: number; leaveRequestId: mongoose.Types.ObjectId | string; fiscalYear: number }
  ): Promise<void>;
  restore(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    leaveTypeId: mongoose.Types.ObjectId,
    amount: number,
    leaveRequestId: mongoose.Types.ObjectId | string,
    input: { amount: number; leaveRequestId: mongoose.Types.ObjectId | string; fiscalYear: number }
  ): Promise<void>;
}

export interface IAuditServiceDep {
  log(entry: {
    tenantId: string;
    actorId: mongoose.Types.ObjectId | string;
    actorType: "employee" | "system" | "bot";
    action: string;
    entityType: string;
    entityId: mongoose.Types.ObjectId | string;
    changes?: Record<string, unknown> | null;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}

// ----------------------------------------------------------------
// Auto-approval workflow interface
// ----------------------------------------------------------------

export interface WorkflowWithAutoRules {
  autoApprovalRules: Array<{
    leaveTypeId: mongoose.Types.ObjectId;
    maxDurationDays: number;
    isActive: boolean;
  }>;
}

// ----------------------------------------------------------------
// Minimum rejection reason length (BR-022)
// ----------------------------------------------------------------

const MIN_REJECTION_REASON_NON_WHITESPACE = 10;

// ----------------------------------------------------------------
// Service
// ----------------------------------------------------------------

export class ApprovalEngineService {
  constructor(
    private readonly leaveRequestRepo: ILeaveRequestRepository,
    private readonly balanceService: IBalanceServiceDep,
    private readonly auditService: IAuditServiceDep
  ) {}

  /**
   * Processes an approval action at the current workflow step.
   * If the final step approves, transitions to "approved" and deducts balance.
   * If a non-final step approves, advances the step and stays "pending_approval".
   */
  async processApproval(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId,
    input: ProcessApprovalInput
  ): Promise<ApprovalResult> {
    const req = await this.requireLeaveRequest(tenantId, leaveRequestId);
    const previousStatus = req.status;

    // Validate that we can apply "approve" to current status
    transition(req.status, "approve");

    const steps = req.workflowSnapshot.steps;
    const currentStep = req.currentStep;
    const isFinalStep = currentStep >= steps.length - 1;

    const historyEntry: ILeaveRequest["approvalHistory"][number] = {
      step: currentStep,
      action: "approved",
      actorId: input.approverId,
      actorName: input.approverName,
      actorRole: input.approverRole,
      delegatedFromId: null,
      reason: input.reason ?? null,
      via: input.via,
      timestamp: new Date(),
    };

    const updatedHistory = [...req.approvalHistory, historyEntry];

    if (isFinalStep) {
      // Final step — transition to approved and deduct balance
      const fiscalYear = new Date().getFullYear();
      await this.balanceService.deduct(
        tenantId,
        req.employeeId as mongoose.Types.ObjectId,
        req.leaveTypeId as mongoose.Types.ObjectId,
        req.workingDays,
        leaveRequestId,
        { amount: req.workingDays, leaveRequestId, fiscalYear }
      );

      await this.leaveRequestRepo.updateStatus(tenantId, leaveRequestId, {
        status: "approved",
        currentStep: -1,
        currentApproverEmployeeId: null,
        currentStepStartedAt: null,
        approvalHistory: updatedHistory,
      });

      await this.auditService.log({
        tenantId,
        actorId: input.approverId,
        actorType: "employee",
        action: "leave_request.approved",
        entityType: "leave_request",
        entityId: leaveRequestId,
        metadata: { step: currentStep, reason: input.reason },
      });

      return {
        leaveRequestId,
        previousStatus,
        newStatus: "approved",
        stepAdvanced: false,
        isTerminal: true,
      };
    }

    // Non-final step — advance step, stay pending_approval
    const nextStep = currentStep + 1;
    const nextStepData = steps[nextStep];
    const nextApproverId =
      nextStepData?.approverUserId ?? null;

    await this.leaveRequestRepo.updateStatus(tenantId, leaveRequestId, {
      status: "pending_approval",
      currentStep: nextStep,
      currentApproverEmployeeId:
        nextApproverId instanceof mongoose.Types.ObjectId
          ? nextApproverId
          : null,
      currentStepStartedAt: new Date(),
      approvalHistory: updatedHistory,
    });

    await this.auditService.log({
      tenantId,
      actorId: input.approverId,
      actorType: "employee",
      action: "leave_request.step_approved",
      entityType: "leave_request",
      entityId: leaveRequestId,
      metadata: { step: currentStep, nextStep, reason: input.reason },
    });

    return {
      leaveRequestId,
      previousStatus,
      newStatus: "pending_approval",
      stepAdvanced: true,
      isTerminal: false,
    };
  }

  /**
   * Rejects a leave request. Reason must contain >= 10 non-whitespace characters (BR-022).
   */
  async processRejection(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId,
    input: ProcessRejectionInput
  ): Promise<ApprovalResult> {
    const nonWhitespaceCount = input.reason.replace(/\s/g, "").length;
    if (nonWhitespaceCount < MIN_REJECTION_REASON_NON_WHITESPACE) {
      throw new Error(
        `Rejection reason must contain at least ${MIN_REJECTION_REASON_NON_WHITESPACE} non-whitespace characters (BR-022)`
      );
    }

    const req = await this.requireLeaveRequest(tenantId, leaveRequestId);
    const previousStatus = req.status;

    transition(req.status, "reject");

    const historyEntry: ILeaveRequest["approvalHistory"][number] = {
      step: req.currentStep,
      action: "rejected",
      actorId: input.approverId,
      actorName: input.approverName,
      actorRole: input.approverRole,
      delegatedFromId: null,
      reason: input.reason,
      via: input.via,
      timestamp: new Date(),
    };

    await this.leaveRequestRepo.updateStatus(tenantId, leaveRequestId, {
      status: "rejected",
      currentStep: -1,
      currentApproverEmployeeId: null,
      currentStepStartedAt: null,
      approvalHistory: [...req.approvalHistory, historyEntry],
    });

    await this.auditService.log({
      tenantId,
      actorId: input.approverId,
      actorType: "employee",
      action: "leave_request.rejected",
      entityType: "leave_request",
      entityId: leaveRequestId,
      metadata: { step: req.currentStep, reason: input.reason },
    });

    return {
      leaveRequestId,
      previousStatus,
      newStatus: "rejected",
      stepAdvanced: false,
      isTerminal: true,
    };
  }

  /**
   * Escalates a leave request to the next approval step on timeout.
   * The status stays "pending_approval"; currentStep may advance.
   */
  async processEscalation(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId,
    input: ProcessEscalationInput
  ): Promise<ApprovalResult> {
    const req = await this.requireLeaveRequest(tenantId, leaveRequestId);
    const previousStatus = req.status;

    transition(req.status, "escalate");

    const steps = req.workflowSnapshot.steps;
    const currentStep = req.currentStep;
    const nextStep = Math.min(currentStep + 1, steps.length - 1);
    const nextStepData = steps[nextStep];
    const nextApproverId = nextStepData?.approverUserId ?? null;

    const historyEntry: ILeaveRequest["approvalHistory"][number] = {
      step: currentStep,
      action: "escalated",
      actorId: new mongoose.Types.ObjectId(), // system actor
      actorName: "System",
      actorRole: "system",
      delegatedFromId: null,
      reason: `Escalated due to ${input.triggeredBy ?? "timeout"}`,
      via: "system",
      timestamp: new Date(),
    };

    await this.leaveRequestRepo.updateStatus(tenantId, leaveRequestId, {
      status: "pending_approval",
      currentStep: nextStep,
      currentApproverEmployeeId:
        nextApproverId instanceof mongoose.Types.ObjectId
          ? nextApproverId
          : null,
      currentStepStartedAt: new Date(),
      reminderCount: 0,
      approvalHistory: [...req.approvalHistory, historyEntry],
    } as LeaveRequestUpdate);

    await this.auditService.log({
      tenantId,
      actorId: "system",
      actorType: "system",
      action: "leave_request.escalated",
      entityType: "leave_request",
      entityId: leaveRequestId,
      metadata: { fromStep: currentStep, toStep: nextStep, triggeredBy: input.triggeredBy },
    });

    return {
      leaveRequestId,
      previousStatus,
      newStatus: "pending_approval",
      stepAdvanced: nextStep > currentStep,
      isTerminal: false,
    };
  }

  /**
   * Cancels a leave request.
   * - pending_approval -> cancelled (no balance impact)
   * - approved -> cancelled (balance is restored)
   */
  async processCancellation(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId,
    input: ProcessCancellationInput
  ): Promise<ApprovalResult> {
    const req = await this.requireLeaveRequest(tenantId, leaveRequestId);
    const previousStatus = req.status;

    // Validate transition — throws InvalidTransitionError if not allowed
    transition(req.status, "cancel");

    const wasApproved =
      previousStatus === "approved" || previousStatus === "auto_approved";

    if (wasApproved) {
      const fiscalYear = new Date().getFullYear();
      await this.balanceService.restore(
        tenantId,
        req.employeeId as mongoose.Types.ObjectId,
        req.leaveTypeId as mongoose.Types.ObjectId,
        req.workingDays,
        leaveRequestId,
        { amount: req.workingDays, leaveRequestId, fiscalYear }
      );
    }

    await this.leaveRequestRepo.updateStatus(tenantId, leaveRequestId, {
      status: "cancelled",
      currentStep: -1,
      currentApproverEmployeeId: null,
      currentStepStartedAt: null,
      cancellationReason: input.reason ?? null,
      cancelledAt: new Date(),
      cancelledBy: input.employeeId,
    });

    await this.auditService.log({
      tenantId,
      actorId: input.employeeId,
      actorType: "employee",
      action: "leave_request.cancelled",
      entityType: "leave_request",
      entityId: leaveRequestId,
      metadata: {
        previousStatus,
        reason: input.reason,
        balanceRestored: wasApproved,
      },
    });

    return {
      leaveRequestId,
      previousStatus,
      newStatus: "cancelled",
      stepAdvanced: false,
      isTerminal: true,
    };
  }

  /**
   * Checks whether an auto-approval rule matches the leave request.
   * Returns true if an active rule covers the leave type and duration.
   */
  checkAutoApproval(
    leaveRequest: ILeaveRequest,
    workflow: WorkflowWithAutoRules
  ): boolean {
    const leaveTypeIdStr = leaveRequest.leaveTypeId.toString();

    return workflow.autoApprovalRules.some(
      (rule) =>
        rule.isActive &&
        rule.leaveTypeId.toString() === leaveTypeIdStr &&
        leaveRequest.workingDays <= rule.maxDurationDays
    );
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async requireLeaveRequest(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId
  ): Promise<ILeaveRequest> {
    const req = await this.leaveRequestRepo.findById(tenantId, leaveRequestId);
    if (req === null) {
      throw new Error(`Leave request not found: ${leaveRequestId.toString()}`);
    }
    return req;
  }
}
