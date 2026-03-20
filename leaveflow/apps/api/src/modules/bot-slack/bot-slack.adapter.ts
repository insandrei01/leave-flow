/**
 * Slack Bot Adapter — implements BotAdapter using Slack Web API patterns.
 *
 * Wraps a Slack WebClient to send messages, update cards, and open modals.
 * All Slack API calls are isolated in this file; business logic must not
 * import from @slack/web-api directly — use this adapter instead.
 */

import type { BotAdapter } from "../bot-adapter/bot-adapter.interface.js";
import type {
  LeaveFormContext,
  LeaveRequestSummary,
  NotificationPayload,
  MessageReference,
  CardUpdate,
  ChannelReference,
  ResolvedUser,
} from "../bot-adapter/bot-adapter.types.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import {
  renderApprovalRequest,
} from "../../../../../packages/bot-messages/src/slack/block-kit.renderer.js";
import type { ApprovalStep } from "../../../../../packages/bot-messages/src/types.js";

// ----------------------------------------------------------------
// Minimal Slack client interface (avoids hard dependency on SDK type)
// ----------------------------------------------------------------

export interface SlackWebClient {
  views: {
    open(args: {
      trigger_id: string;
      view: Record<string, unknown>;
    }): Promise<{ ok: boolean }>;
  };
  chat: {
    postMessage(args: {
      channel: string;
      text?: string;
      blocks?: unknown[];
    }): Promise<{ ok: boolean; ts?: string; channel?: string }>;
    update(args: {
      channel: string;
      ts: string;
      text?: string;
      blocks?: unknown[];
    }): Promise<{ ok: boolean }>;
  };
  conversations: {
    open(args: {
      users: string;
    }): Promise<{ ok: boolean; channel?: { id?: string } }>;
  };
}

// ----------------------------------------------------------------
// Build leave request modal view
// ----------------------------------------------------------------

function buildLeaveRequestModal(context: LeaveFormContext): Record<string, unknown> {
  const leaveTypeOptions = context.leaveTypes.map((lt) => ({
    text: { type: "plain_text", text: lt.name },
    value: lt.id,
  }));

  return {
    type: "modal",
    callback_id: "leave_request_form",
    title: { type: "plain_text", text: "Request Leave" },
    submit: { type: "plain_text", text: "Submit" },
    close: { type: "plain_text", text: "Cancel" },
    private_metadata: context.prefillRequestId ?? "",
    blocks: [
      {
        type: "input",
        block_id: "leave_type_block",
        label: { type: "plain_text", text: "Leave Type" },
        element: {
          type: "static_select",
          action_id: "leave_type_select",
          placeholder: { type: "plain_text", text: "Select leave type" },
          options: leaveTypeOptions,
        },
      },
      {
        type: "input",
        block_id: "start_date_block",
        label: { type: "plain_text", text: "Start Date" },
        element: {
          type: "datepicker",
          action_id: "start_date_picker",
          placeholder: { type: "plain_text", text: "Select start date" },
        },
      },
      {
        type: "input",
        block_id: "end_date_block",
        label: { type: "plain_text", text: "End Date" },
        element: {
          type: "datepicker",
          action_id: "end_date_picker",
          placeholder: { type: "plain_text", text: "Select end date" },
        },
      },
      {
        type: "input",
        block_id: "reason_block",
        optional: true,
        label: { type: "plain_text", text: "Reason (optional)" },
        element: {
          type: "plain_text_input",
          action_id: "reason_input",
          multiline: true,
          placeholder: { type: "plain_text", text: "Brief reason for leave..." },
        },
      },
    ],
  };
}

// ----------------------------------------------------------------
// Build approval chain for message rendering
// ----------------------------------------------------------------

function buildApprovalChain(summary: LeaveRequestSummary): ApprovalStep[] {
  return summary.approvalChain.map((name, idx) => ({
    name,
    state:
      idx < summary.currentStepIndex
        ? "completed"
        : idx === summary.currentStepIndex
          ? "active"
          : "pending",
  }));
}

// ----------------------------------------------------------------
// SlackBotAdapter
// ----------------------------------------------------------------

export class SlackBotAdapter implements BotAdapter {
  constructor(
    private readonly client: SlackWebClient,
    private readonly mappingService: BotMappingService
  ) {}

  /**
   * Opens a leave request modal using views.open (requires triggerId).
   */
  async sendLeaveRequestForm(context: LeaveFormContext): Promise<void> {
    if (context.triggerId === undefined || context.triggerId === "") {
      throw new Error("triggerId is required for Slack modal");
    }

    const view = buildLeaveRequestModal(context);
    await this.client.views.open({ trigger_id: context.triggerId, view });
  }

  /**
   * Sends an approval card to the approver's DM.
   */
  async sendApprovalCard(
    request: LeaveRequestSummary,
    approverPlatformUserId: string
  ): Promise<MessageReference> {
    const channel = await this.openDmChannel(approverPlatformUserId);

    const chain = buildApprovalChain(request);
    const message = renderApprovalRequest({
      requestId: request.requestId,
      employeeName: request.employeeName,
      employeeAvatarUrl: request.employeeAvatarUrl,
      leaveTypeName: request.leaveTypeName,
      startDate: request.startDate,
      endDate: request.endDate,
      workingDays: request.workingDays,
      reason: request.reason,
      teamName: request.teamName,
      balanceAfter: request.balanceAfter,
      balanceTotal: request.balanceTotal,
      teamCoverage: request.teamCoverage,
      othersOut: request.othersOut,
      approvalChain: chain,
      submittedAt: request.submittedAt,
      autoEscalateInHours: request.autoEscalateInHours,
      appBaseUrl: "",
    });

    const response = await this.client.chat.postMessage({
      channel,
      text: `Leave request from ${request.employeeName} needs your approval`,
      blocks: [...message.blocks] as unknown[],
    });

    return Object.freeze({
      platform: "slack" as const,
      channelId: response.channel ?? channel,
      messageId: response.ts ?? "",
    });
  }

  /**
   * Updates an existing approval card in-place after approve/reject.
   */
  async updateApprovalCard(
    messageRef: MessageReference,
    update: CardUpdate
  ): Promise<void> {
    const statusText =
      update.status === "approved"
        ? `:white_check_mark: *Approved* by ${update.actorName} at ${update.actedAt}`
        : update.status === "rejected"
          ? `:x: *Rejected* by ${update.actorName} at ${update.actedAt}${update.rejectionReason ? `\n> _"${update.rejectionReason}"_` : ""}`
          : `:no_entry: *Cancelled* at ${update.actedAt}`;

    const blocks = [
      {
        type: "section",
        text: { type: "mrkdwn", text: statusText },
      },
    ];

    await this.client.chat.update({
      channel: messageRef.channelId,
      ts: messageRef.messageId,
      text: `Leave request ${update.status}`,
      blocks,
    });
  }

  /**
   * Sends a plain or structured DM to a platform user.
   */
  async sendDirectMessage(
    platformUserId: string,
    message: NotificationPayload
  ): Promise<MessageReference> {
    const channel = await this.openDmChannel(platformUserId);

    const response = await this.client.chat.postMessage({
      channel,
      text: message.text,
    });

    return Object.freeze({
      platform: "slack" as const,
      channelId: response.channel ?? channel,
      messageId: response.ts ?? "",
    });
  }

  /**
   * Posts a message to a channel.
   */
  async postToChannel(
    channelRef: ChannelReference,
    message: NotificationPayload
  ): Promise<MessageReference> {
    const response = await this.client.chat.postMessage({
      channel: channelRef.channelId,
      text: message.text,
    });

    return Object.freeze({
      platform: "slack" as const,
      channelId: response.channel ?? channelRef.channelId,
      messageId: response.ts ?? "",
    });
  }

  /**
   * Resolves a Slack user ID to a LeaveFlow identity via bot mapping.
   */
  async resolveUser(platformUserId: string): Promise<ResolvedUser | null> {
    const mapping = await this.mappingService.resolveUser("slack", platformUserId);

    if (mapping === null) {
      return null;
    }

    return Object.freeze({
      tenantId: mapping.tenantId,
      employeeId: mapping.employeeId,
      platformUserId,
      platform: "slack" as const,
    });
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async openDmChannel(platformUserId: string): Promise<string> {
    const result = await this.client.conversations.open({ users: platformUserId });

    const channelId = result.channel?.id;
    if (channelId === undefined || channelId === "") {
      throw new Error(`Failed to open DM channel with Slack user: ${platformUserId}`);
    }

    return channelId;
  }
}
