/**
 * Slack interaction handlers — view_submission and block_actions.
 *
 * Handles:
 * - view_submission: leave_request_form → creates leave request
 * - block_actions: approve_request → calls approval engine
 * - block_actions: reject_request → opens reject reason dialog, then rejects
 */

import mongoose from "mongoose";
import type { SlackBotAdapter } from "./bot-slack.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";
import type { ApprovalEngineService } from "../approval-engine/approval-engine.service.js";

// ----------------------------------------------------------------
// Interaction payload types
// ----------------------------------------------------------------

export interface SlackViewSubmissionPayload {
  readonly type: "view_submission";
  readonly user: { readonly id: string };
  readonly view: {
    readonly callback_id: string;
    readonly private_metadata: string;
    readonly state: {
      readonly values: Record<string, Record<string, { value?: string }>>;
    };
  };
}

export interface SlackBlockActionPayload {
  readonly type: "block_actions";
  readonly user: { readonly id: string };
  readonly trigger_id: string;
  readonly actions: ReadonlyArray<{
    readonly action_id: string;
    readonly value: string;
  }>;
  readonly message?: {
    readonly ts: string;
    readonly channel?: { readonly id?: string };
  };
  readonly channel?: { readonly id?: string };
}

// ----------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------

export interface SlackInteractionsDeps {
  readonly adapter: SlackBotAdapter;
  readonly mappingService: BotMappingService;
  readonly leaveRequestService: LeaveRequestService;
  readonly approvalEngine: ApprovalEngineService;
  readonly workflowId: string;
}

// ----------------------------------------------------------------
// view_submission: leave_request_form
// ----------------------------------------------------------------

/**
 * Processes the leave request form submission.
 * Extracts form values, creates a leave request via service.
 */
export async function handleLeaveFormSubmission(
  payload: SlackViewSubmissionPayload,
  deps: SlackInteractionsDeps
): Promise<void> {
  const values = payload.view.state.values;

  const leaveTypeId = values["leave_type_block"]?.["leave_type_select"]?.value;
  const startDateStr = values["start_date_block"]?.["start_date_picker"]?.value;
  const endDateStr = values["end_date_block"]?.["end_date_picker"]?.value;
  const reason = values["reason_block"]?.["reason_input"]?.value ?? null;

  if (
    leaveTypeId === undefined ||
    startDateStr === undefined ||
    endDateStr === undefined
  ) {
    throw new Error("Missing required form values in leave request submission");
  }

  const resolved = await deps.mappingService.resolveUser("slack", payload.user.id);

  if (resolved === null) {
    throw new Error(
      `Slack user ${payload.user.id} is not connected to LeaveFlow`
    );
  }

  await deps.leaveRequestService.create(
    resolved.tenantId,
    new mongoose.Types.ObjectId(resolved.employeeId),
    {
      workflowId: new mongoose.Types.ObjectId(deps.workflowId),
      leaveTypeId: new mongoose.Types.ObjectId(leaveTypeId),
      startDate: new Date(startDateStr),
      endDate: new Date(endDateStr),
      reason: reason ?? undefined,
    }
  );
}

// ----------------------------------------------------------------
// block_actions: approve_request
// ----------------------------------------------------------------

/**
 * Handles the Approve button click on an approval card.
 * Calls the approval engine and updates the card in-place.
 */
export async function handleApproveAction(
  payload: SlackBlockActionPayload,
  deps: SlackInteractionsDeps
): Promise<void> {
  const action = payload.actions.find((a) => a.action_id === "approve_request");

  if (action === undefined) {
    throw new Error("approve_request action not found in payload");
  }

  const requestId = action.value;
  const resolved = await deps.mappingService.resolveUser("slack", payload.user.id);

  if (resolved === null) {
    throw new Error(`Slack user ${payload.user.id} not connected to LeaveFlow`);
  }

  await deps.approvalEngine.processApproval(
    resolved.tenantId,
    new mongoose.Types.ObjectId(requestId),
    {
      approverId: new mongoose.Types.ObjectId(resolved.employeeId),
      approverName: payload.user.id,
      approverRole: "approver",
      via: "slack",
    }
  );

  // Update the card to reflect approval
  const channelId = payload.channel?.id ?? payload.message?.channel?.id ?? "";
  const ts = payload.message?.ts ?? "";

  if (channelId !== "" && ts !== "") {
    await deps.adapter.updateApprovalCard(
      { platform: "slack", channelId, messageId: ts },
      {
        status: "approved",
        actorName: payload.user.id,
        actedAt: new Date().toISOString(),
      }
    );
  }
}

// ----------------------------------------------------------------
// block_actions: reject_request — phase 1: open reason dialog
// ----------------------------------------------------------------

/**
 * Opens a rejection reason modal when the Reject button is clicked.
 * The actual rejection is processed in handleRejectReasonSubmission.
 */
export async function handleRejectAction(
  payload: SlackBlockActionPayload,
  deps: SlackInteractionsDeps
): Promise<void> {
  const action = payload.actions.find((a) => a.action_id === "reject_request");

  if (action === undefined) {
    throw new Error("reject_request action not found in payload");
  }

  const requestId = action.value;
  const channelId = payload.channel?.id ?? payload.message?.channel?.id ?? "";
  const ts = payload.message?.ts ?? "";

  // Encode context into private_metadata for the dialog
  const metadata = JSON.stringify({ requestId, channelId, ts });

  await deps.adapter.sendLeaveRequestForm({
    platformUserId: payload.user.id,
    triggerId: payload.trigger_id,
    leaveTypes: [],
    prefillRequestId: metadata,
  });
}

// ----------------------------------------------------------------
// view_submission: reject_reason_form
// ----------------------------------------------------------------

/**
 * Processes the rejection reason form submission.
 * Calls the approval engine with the provided reason.
 */
export async function handleRejectReasonSubmission(
  payload: SlackViewSubmissionPayload,
  deps: SlackInteractionsDeps
): Promise<void> {
  const values = payload.view.state.values;
  const reason = values["reject_reason_block"]?.["reject_reason_input"]?.value;

  if (reason === undefined || reason.trim().length === 0) {
    throw new Error("Rejection reason is required");
  }

  let metadata: { requestId: string; channelId: string; ts: string };
  try {
    metadata = JSON.parse(payload.view.private_metadata) as typeof metadata;
  } catch {
    throw new Error("Invalid metadata in rejection reason form");
  }

  const resolved = await deps.mappingService.resolveUser("slack", payload.user.id);

  if (resolved === null) {
    throw new Error(`Slack user ${payload.user.id} not connected to LeaveFlow`);
  }

  await deps.approvalEngine.processRejection(
    resolved.tenantId,
    new mongoose.Types.ObjectId(metadata.requestId),
    {
      approverId: new mongoose.Types.ObjectId(resolved.employeeId),
      approverName: payload.user.id,
      approverRole: "approver",
      reason,
      via: "slack",
    }
  );

  if (metadata.channelId !== "" && metadata.ts !== "") {
    await deps.adapter.updateApprovalCard(
      { platform: "slack", channelId: metadata.channelId, messageId: metadata.ts },
      {
        status: "rejected",
        actorName: payload.user.id,
        actedAt: new Date().toISOString(),
        rejectionReason: reason,
      }
    );
  }
}
