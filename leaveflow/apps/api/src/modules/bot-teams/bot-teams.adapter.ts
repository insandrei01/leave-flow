/**
 * Teams Bot Adapter — implements BotAdapter using Bot Framework patterns.
 *
 * Wraps a minimal BotFramework client interface to send Adaptive Cards,
 * update activities, and resolve user identities.
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
} from "../../../../../packages/bot-messages/src/teams/adaptive-card.renderer.js";
import type { ApprovalStep } from "../../../../../packages/bot-messages/src/types.js";

// ----------------------------------------------------------------
// Minimal Bot Framework client interface
// ----------------------------------------------------------------

export interface TeamsConversationReference {
  readonly serviceUrl: string;
  readonly channelId: string;
  readonly conversation: { readonly id: string };
  readonly bot: { readonly id: string; readonly name: string };
  readonly user?: { readonly id: string; readonly name?: string };
  readonly activityId?: string;
}

export interface TeamsBotClient {
  /**
   * Sends an activity (message/card) to a conversation.
   * Returns the activity ID of the sent message.
   */
  sendActivity(
    conversationRef: TeamsConversationReference,
    activity: {
      type: string;
      text?: string;
      attachments?: Array<{
        contentType: string;
        content: Record<string, unknown>;
      }>;
    }
  ): Promise<{ activityId: string }>;

  /**
   * Updates an existing activity in a conversation.
   */
  updateActivity(
    conversationRef: TeamsConversationReference,
    activityId: string,
    activity: {
      type: string;
      text?: string;
      attachments?: Array<{
        contentType: string;
        content: Record<string, unknown>;
      }>;
    }
  ): Promise<void>;

  /**
   * Creates a new conversation (DM) with a user if one doesn't exist.
   * Returns a conversation reference for subsequent messaging.
   */
  createConversation(
    serviceUrl: string,
    tenantId: string,
    userId: string
  ): Promise<TeamsConversationReference>;
}

// ----------------------------------------------------------------
// Adaptive Card attachment builder
// ----------------------------------------------------------------

const ADAPTIVE_CARD_CONTENT_TYPE = "application/vnd.microsoft.card.adaptive";

function toAttachment(card: Record<string, unknown>): {
  contentType: string;
  content: Record<string, unknown>;
} {
  return {
    contentType: ADAPTIVE_CARD_CONTENT_TYPE,
    content: card,
  };
}

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
// Leave request form card builder
// ----------------------------------------------------------------

function buildLeaveRequestFormCard(context: LeaveFormContext): Record<string, unknown> {
  const leaveTypeChoices = context.leaveTypes.map((lt) => ({
    title: lt.name,
    value: lt.id,
  }));

  return {
    type: "AdaptiveCard",
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    version: "1.5",
    body: [
      {
        type: "TextBlock",
        text: "Request Leave",
        weight: "Bolder",
        size: "Medium",
        wrap: true,
      },
      {
        type: "Input.ChoiceSet",
        id: "leaveTypeId",
        label: "Leave Type",
        isRequired: true,
        choices: leaveTypeChoices,
        placeholder: "Select leave type",
      },
      {
        type: "Input.Date",
        id: "startDate",
        label: "Start Date",
        isRequired: true,
      },
      {
        type: "Input.Date",
        id: "endDate",
        label: "End Date",
        isRequired: true,
      },
      {
        type: "Input.Text",
        id: "reason",
        label: "Reason (optional)",
        isMultiline: true,
        placeholder: "Brief reason for leave...",
      },
    ],
    actions: [
      {
        type: "Action.Execute",
        title: "Submit",
        verb: "submit_leave_form",
        style: "positive",
      },
      {
        type: "Action.Execute",
        title: "Cancel",
        verb: "cancel_leave_form",
      },
    ],
  };
}

// ----------------------------------------------------------------
// TeamsBotAdapter
// ----------------------------------------------------------------

export class TeamsBotAdapter implements BotAdapter {
  constructor(
    private readonly client: TeamsBotClient,
    private readonly mappingService: BotMappingService,
    private readonly defaultServiceUrl: string
  ) {}

  /**
   * Sends an Adaptive Card with Input fields to the user's DM.
   */
  async sendLeaveRequestForm(context: LeaveFormContext): Promise<void> {
    const conversationRef = await this.getOrCreateDm(
      context.platformUserId,
      ""
    );

    const card = buildLeaveRequestFormCard(context);

    await this.client.sendActivity(conversationRef, {
      type: "message",
      attachments: [toAttachment(card)],
    });
  }

  /**
   * Sends an approval Adaptive Card to the approver.
   */
  async sendApprovalCard(
    request: LeaveRequestSummary,
    approverPlatformUserId: string
  ): Promise<MessageReference> {
    const resolved = await this.mappingService.resolveUser(
      "teams",
      approverPlatformUserId
    );

    const tenantId = resolved?.tenantId ?? "";
    const conversationRef = await this.getOrCreateDm(
      approverPlatformUserId,
      tenantId
    );

    const chain = buildApprovalChain(request);
    const card = renderApprovalRequest({
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

    const response = await this.client.sendActivity(conversationRef, {
      type: "message",
      attachments: [toAttachment(card as unknown as Record<string, unknown>)],
    });

    return Object.freeze({
      platform: "teams" as const,
      channelId: conversationRef.conversation.id,
      messageId: response.activityId,
      conversationRef: conversationRef as unknown as Record<string, unknown>,
    });
  }

  /**
   * Updates an existing approval card to show the new status.
   */
  async updateApprovalCard(
    messageRef: MessageReference,
    update: CardUpdate
  ): Promise<void> {
    const conversationRef = messageRef.conversationRef as TeamsConversationReference | undefined;

    if (conversationRef === undefined) {
      throw new Error("Teams MessageReference missing conversationRef");
    }

    const statusColor =
      update.status === "approved" ? "Good" : update.status === "rejected" ? "Attention" : "Default";

    const statusText =
      update.status === "approved"
        ? `Approved by ${update.actorName} at ${update.actedAt}`
        : update.status === "rejected"
          ? `Rejected by ${update.actorName} at ${update.actedAt}${update.rejectionReason ? ` — "${update.rejectionReason}"` : ""}`
          : `Cancelled at ${update.actedAt}`;

    const updatedCard = {
      type: "AdaptiveCard",
      $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
      version: "1.5",
      body: [
        {
          type: "TextBlock",
          text: statusText,
          color: statusColor,
          wrap: true,
        },
      ],
    };

    await this.client.updateActivity(
      conversationRef,
      messageRef.messageId,
      {
        type: "message",
        attachments: [toAttachment(updatedCard)],
      }
    );
  }

  /**
   * Sends a plain text or card DM to a Teams user.
   */
  async sendDirectMessage(
    platformUserId: string,
    message: NotificationPayload
  ): Promise<MessageReference> {
    const resolved = await this.mappingService.resolveUser("teams", platformUserId);
    const tenantId = resolved?.tenantId ?? "";
    const conversationRef = await this.getOrCreateDm(platformUserId, tenantId);

    const response = await this.client.sendActivity(conversationRef, {
      type: "message",
      text: message.text,
    });

    return Object.freeze({
      platform: "teams" as const,
      channelId: conversationRef.conversation.id,
      messageId: response.activityId,
      conversationRef: conversationRef as unknown as Record<string, unknown>,
    });
  }

  /**
   * Posts a message to a Teams channel.
   */
  async postToChannel(
    channelRef: ChannelReference,
    message: NotificationPayload
  ): Promise<MessageReference> {
    const conversationRef: TeamsConversationReference = {
      serviceUrl: this.defaultServiceUrl,
      channelId: "msteams",
      conversation: { id: channelRef.channelId },
      bot: { id: "bot", name: "LeaveFlow" },
    };

    const response = await this.client.sendActivity(conversationRef, {
      type: "message",
      text: message.text,
    });

    return Object.freeze({
      platform: "teams" as const,
      channelId: channelRef.channelId,
      messageId: response.activityId,
      conversationRef: conversationRef as unknown as Record<string, unknown>,
    });
  }

  /**
   * Resolves a Teams user AAD object ID to a LeaveFlow identity.
   */
  async resolveUser(platformUserId: string): Promise<ResolvedUser | null> {
    const mapping = await this.mappingService.resolveUser("teams", platformUserId);

    if (mapping === null) {
      return null;
    }

    return Object.freeze({
      tenantId: mapping.tenantId,
      employeeId: mapping.employeeId,
      platformUserId,
      platform: "teams" as const,
    });
  }

  // ----------------------------------------------------------------
  // Private helpers
  // ----------------------------------------------------------------

  private async getOrCreateDm(
    platformUserId: string,
    tenantId: string
  ): Promise<TeamsConversationReference> {
    const resolved = await this.mappingService.resolveUser("teams", platformUserId);
    const ref = resolved?.conversationReference as TeamsConversationReference | null | undefined;

    if (ref !== null && ref !== undefined) {
      return ref;
    }

    // Create a new conversation
    return this.client.createConversation(
      this.defaultServiceUrl,
      tenantId,
      platformUserId
    );
  }
}
