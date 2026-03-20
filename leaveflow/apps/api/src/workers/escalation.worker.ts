/**
 * Escalation worker — processes overdue approval steps across all tenants.
 *
 * Runs as a BullMQ repeatable job every 15 minutes.
 * For each job:
 * 1. Load the leave request by ID
 * 2. Verify it's still pending at the expected step
 * 3. Check whether the step timeout has been exceeded
 * 4. Apply the configured escalation action: remind, escalate_next, or none
 * 5. Write an audit log entry for the action taken
 */

import mongoose from "mongoose";
import type { EscalationJobData } from "../lib/bullmq.js";
import type { ILeaveRequest } from "../models/index.js";

// ----------------------------------------------------------------
// Dependency interfaces (loose coupling)
// ----------------------------------------------------------------

export interface ILeaveRequestRepoDep {
  findById(tenantId: string, id: mongoose.Types.ObjectId): Promise<ILeaveRequest | null>;
  updateStatus(
    tenantId: string,
    id: mongoose.Types.ObjectId,
    update: Record<string, unknown>
  ): Promise<void>;
}

export interface IApprovalEngineDep {
  processEscalation(
    tenantId: string,
    leaveRequestId: mongoose.Types.ObjectId,
    input: { triggeredBy: string }
  ): Promise<unknown>;
}

export interface INotificationServiceDep {
  notify(input: {
    tenantId: string;
    recipientEmployeeId: string;
    eventType: string;
    referenceType: string;
    referenceId: string;
  }): Promise<unknown>;
}

export interface IAuditServiceDep {
  log(entry: {
    tenantId: string;
    actorId: string;
    actorType: "system";
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown> | null;
  }): Promise<void>;
}

export interface EscalationWorkerDeps {
  leaveRequestRepo: ILeaveRequestRepoDep;
  approvalEngine: IApprovalEngineDep;
  notificationService: INotificationServiceDep;
  auditService: IAuditServiceDep;
}

// ----------------------------------------------------------------
// Job processor (pure business logic — no BullMQ import needed here)
// ----------------------------------------------------------------

/**
 * Processes a single escalation job.
 *
 * Guards:
 * - Leave request must exist and be pending_approval
 * - currentStep must match the job's stepIndex (prevents double-processing)
 * - Timeout hours must have been exceeded
 *
 * Actions (based on workflowSnapshot step escalationAction):
 * - "remind": send reminder DM, increment reminderCount
 *   - When maxReminders exceeded: fall through to escalate_next
 * - "escalate_next": advance to next step via approval engine
 * - "none" / "notify_hr": notify HR of the overdue request
 * - "auto_approve": handled outside this worker (not yet implemented)
 */
export async function processEscalationJob(
  data: EscalationJobData,
  deps: EscalationWorkerDeps
): Promise<void> {
  const { tenantId, leaveRequestId, stepIndex } = data;

  const leaveRequestObjectId = toObjectId(leaveRequestId);

  const req = await deps.leaveRequestRepo.findById(tenantId, leaveRequestObjectId);
  if (req === null) {
    console.warn(`[escalation] Leave request not found: ${leaveRequestId}`);
    return;
  }

  if (!isStillPendingAtStep(req, stepIndex)) {
    return;
  }

  const step = req.workflowSnapshot.steps[stepIndex];
  if (step === undefined) {
    console.warn(`[escalation] Step ${stepIndex} not found in snapshot for ${leaveRequestId}`);
    return;
  }

  if (!isTimeoutExceeded(req.currentStepStartedAt, step.timeoutHours)) {
    return;
  }

  const escalationAction = resolveEscalationAction(
    step.escalationAction,
    req.reminderCount ?? 0,
    step.maxReminders ?? 1
  );

  if (escalationAction === "remind") {
    await sendReminderAndUpdate(req, deps);
  } else if (escalationAction === "escalate_next") {
    await escalateToNextStep(req, deps);
  } else {
    await notifyHr(req, deps);
  }
}

// ----------------------------------------------------------------
// Action handlers
// ----------------------------------------------------------------

async function sendReminderAndUpdate(
  req: ILeaveRequest,
  deps: EscalationWorkerDeps
): Promise<void> {
  const tenantId = req.tenantId;
  const approverId = req.currentApproverEmployeeId?.toString();

  if (approverId !== undefined && approverId !== "") {
    await deps.notificationService.notify({
      tenantId,
      recipientEmployeeId: approverId,
      eventType: "approval_reminder",
      referenceType: "leave_request",
      referenceId: req._id.toString(),
    });
  }

  const newReminderCount = (req.reminderCount ?? 0) + 1;

  await deps.leaveRequestRepo.updateStatus(tenantId, req._id as mongoose.Types.ObjectId, {
    reminderCount: newReminderCount,
  });

  await deps.auditService.log({
    tenantId,
    actorId: "system",
    actorType: "system",
    action: "leave_request.reminder_sent",
    entityType: "leave_request",
    entityId: req._id.toString(),
    metadata: { step: req.currentStep, reminderCount: newReminderCount },
  });
}

async function escalateToNextStep(
  req: ILeaveRequest,
  deps: EscalationWorkerDeps
): Promise<void> {
  await deps.approvalEngine.processEscalation(
    req.tenantId,
    req._id as mongoose.Types.ObjectId,
    { triggeredBy: "timeout" }
  );

  await deps.auditService.log({
    tenantId: req.tenantId,
    actorId: "system",
    actorType: "system",
    action: "leave_request.auto_escalated",
    entityType: "leave_request",
    entityId: req._id.toString(),
    metadata: { fromStep: req.currentStep, triggeredBy: "timeout" },
  });
}

async function notifyHr(
  req: ILeaveRequest,
  deps: EscalationWorkerDeps
): Promise<void> {
  // Notify the requester's employee record (HR will receive it via channel routing)
  await deps.notificationService.notify({
    tenantId: req.tenantId,
    recipientEmployeeId: req.employeeId.toString(),
    eventType: "request_escalated",
    referenceType: "leave_request",
    referenceId: req._id.toString(),
  });

  await deps.auditService.log({
    tenantId: req.tenantId,
    actorId: "system",
    actorType: "system",
    action: "leave_request.hr_notified",
    entityType: "leave_request",
    entityId: req._id.toString(),
    metadata: { step: req.currentStep, reason: "no_escalation_path" },
  });
}

// ----------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------

function isStillPendingAtStep(req: ILeaveRequest, stepIndex: number): boolean {
  return req.status === "pending_approval" && req.currentStep === stepIndex;
}

function isTimeoutExceeded(
  startedAt: Date | null,
  timeoutHours: number
): boolean {
  if (startedAt === null) {
    return false;
  }
  const elapsedMs = Date.now() - startedAt.getTime();
  const timeoutMs = timeoutHours * 3_600_000;
  return elapsedMs >= timeoutMs;
}

/**
 * Resolves effective escalation action.
 *
 * When action is "remind" but reminderCount >= maxReminders, the step
 * escalates to the next approver instead of sending another reminder.
 */
function resolveEscalationAction(
  configuredAction: string,
  reminderCount: number,
  maxReminders: number
): "remind" | "escalate_next" | "notify_hr" {
  if (configuredAction === "remind") {
    if (reminderCount >= maxReminders) {
      return "escalate_next";
    }
    return "remind";
  }

  if (configuredAction === "escalate_next") {
    return "escalate_next";
  }

  return "notify_hr";
}

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}
