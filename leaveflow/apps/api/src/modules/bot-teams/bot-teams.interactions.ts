/**
 * Teams interaction handlers — Action.Execute and form submission.
 *
 * Handles:
 * - submit_leave_form verb → creates leave request
 * - approve verb → calls approval engine, updates card
 * - reject verb → calls approval engine with reason, updates card
 */

import mongoose from "mongoose";
import type { TeamsBotAdapter } from "./bot-teams.adapter.js";
import type { TeamsConversationReference } from "./bot-teams.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";
import type { ApprovalEngineService } from "../approval-engine/approval-engine.service.js";

// ----------------------------------------------------------------
// Platform-agnostic action payload (used by adapter and plugin)
// ----------------------------------------------------------------

export interface TeamsActionPayload {
  readonly verb: string;
  readonly platformUserId: string;
  readonly data: Record<string, unknown>;
  readonly conversationRef: TeamsConversationReference;
  readonly messageId?: string;
}

// ----------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------

export interface TeamsInteractionsDeps {
  readonly adapter: TeamsBotAdapter;
  readonly mappingService: BotMappingService;
  readonly leaveRequestService: LeaveRequestService;
  readonly approvalEngine: ApprovalEngineService;
  readonly workflowId: string;
}

// ----------------------------------------------------------------
// submit_leave_form
// ----------------------------------------------------------------

/**
 * Creates a leave request from the Teams form submission.
 */
export async function handleLeaveFormSubmit(
  payload: TeamsActionPayload,
  deps: TeamsInteractionsDeps
): Promise<void> {
  const { data } = payload;

  const leaveTypeId = data["leaveTypeId"] as string | undefined;
  const startDate = data["startDate"] as string | undefined;
  const endDate = data["endDate"] as string | undefined;
  const reason = data["reason"] as string | undefined;

  if (
    leaveTypeId === undefined ||
    leaveTypeId === "" ||
    startDate === undefined ||
    endDate === undefined
  ) {
    throw new Error("Missing required form fields: leaveTypeId, startDate, endDate");
  }

  const resolved = await deps.mappingService.resolveUser("teams", payload.platformUserId);

  if (resolved === null) {
    throw new Error(
      `Teams user ${payload.platformUserId} is not connected to LeaveFlow`
    );
  }

  await deps.leaveRequestService.create(
    resolved.tenantId,
    new mongoose.Types.ObjectId(resolved.employeeId),
    {
      workflowId: new mongoose.Types.ObjectId(deps.workflowId),
      leaveTypeId: new mongoose.Types.ObjectId(leaveTypeId),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason ?? undefined,
    }
  );
}

// ----------------------------------------------------------------
// approve
// ----------------------------------------------------------------

/**
 * Processes an approval action and updates the approval card.
 */
export async function handleApproveAction(
  payload: TeamsActionPayload,
  deps: TeamsInteractionsDeps
): Promise<void> {
  const requestId = payload.data["requestId"] as string | undefined;

  if (requestId === undefined || requestId === "") {
    throw new Error("requestId is required in approve action data");
  }

  const resolved = await deps.mappingService.resolveUser("teams", payload.platformUserId);

  if (resolved === null) {
    throw new Error(`Teams user ${payload.platformUserId} is not connected to LeaveFlow`);
  }

  await deps.approvalEngine.processApproval(
    resolved.tenantId,
    new mongoose.Types.ObjectId(requestId),
    {
      approverId: new mongoose.Types.ObjectId(resolved.employeeId),
      approverName: payload.platformUserId,
      approverRole: "approver",
      via: "teams",
    }
  );

  if (payload.messageId !== undefined && payload.messageId !== "") {
    await deps.adapter.updateApprovalCard(
      {
        platform: "teams",
        channelId: payload.conversationRef.conversation.id,
        messageId: payload.messageId,
        conversationRef: payload.conversationRef as unknown as Record<string, unknown>,
      },
      {
        status: "approved",
        actorName: payload.platformUserId,
        actedAt: new Date().toISOString(),
      }
    );
  }
}

// ----------------------------------------------------------------
// reject
// ----------------------------------------------------------------

/**
 * Processes a rejection action and updates the approval card.
 */
export async function handleRejectAction(
  payload: TeamsActionPayload,
  deps: TeamsInteractionsDeps
): Promise<void> {
  const requestId = payload.data["requestId"] as string | undefined;
  const reason = payload.data["reason"] as string | undefined;

  if (requestId === undefined || requestId === "") {
    throw new Error("requestId is required in reject action data");
  }

  if (reason === undefined || reason.trim().length === 0) {
    throw new Error("reason is required in reject action data");
  }

  const resolved = await deps.mappingService.resolveUser("teams", payload.platformUserId);

  if (resolved === null) {
    throw new Error(`Teams user ${payload.platformUserId} is not connected to LeaveFlow`);
  }

  await deps.approvalEngine.processRejection(
    resolved.tenantId,
    new mongoose.Types.ObjectId(requestId),
    {
      approverId: new mongoose.Types.ObjectId(resolved.employeeId),
      approverName: payload.platformUserId,
      approverRole: "approver",
      reason,
      via: "teams",
    }
  );

  if (payload.messageId !== undefined && payload.messageId !== "") {
    await deps.adapter.updateApprovalCard(
      {
        platform: "teams",
        channelId: payload.conversationRef.conversation.id,
        messageId: payload.messageId,
        conversationRef: payload.conversationRef as unknown as Record<string, unknown>,
      },
      {
        status: "rejected",
        actorName: payload.platformUserId,
        actedAt: new Date().toISOString(),
        rejectionReason: reason,
      }
    );
  }
}
