/**
 * BotAdapter interface — platform-agnostic contract for all bot integrations.
 *
 * Each platform (Slack, Teams) provides a concrete implementation.
 * Business logic depends on this interface, never on the platform SDK directly.
 */

import type {
  LeaveFormContext,
  LeaveRequestSummary,
  NotificationPayload,
  MessageReference,
  CardUpdate,
  ChannelReference,
  ResolvedUser,
} from "./bot-adapter.types.js";

// ----------------------------------------------------------------
// BotAdapter interface
// ----------------------------------------------------------------

export interface BotAdapter {
  /**
   * Opens or sends an interactive leave request form to the user.
   *
   * - Slack: opens a modal via views.open (requires triggerId)
   * - Teams: sends an Adaptive Card with input fields to the user's DM
   */
  sendLeaveRequestForm(context: LeaveFormContext): Promise<void>;

  /**
   * Sends an approval card to the approver with Approve/Reject actions.
   *
   * Returns a MessageReference so the card can be updated later
   * (e.g., after the approver acts).
   */
  sendApprovalCard(
    request: LeaveRequestSummary,
    approverPlatformUserId: string
  ): Promise<MessageReference>;

  /**
   * Updates an existing approval card in-place to reflect the new status.
   *
   * Called after an approve/reject action to replace the action buttons
   * with a status summary.
   */
  updateApprovalCard(
    messageRef: MessageReference,
    update: CardUpdate
  ): Promise<void>;

  /**
   * Sends a plain or structured direct message to a platform user.
   *
   * Used for: approved/rejected notifications, balance check responses,
   * stale reminders.
   */
  sendDirectMessage(
    platformUserId: string,
    message: NotificationPayload
  ): Promise<MessageReference>;

  /**
   * Posts a message to a channel (team announcement, etc.).
   *
   * Used for: team announcements when a leave is approved (BR-092).
   */
  postToChannel(
    channelRef: ChannelReference,
    message: NotificationPayload
  ): Promise<MessageReference>;

  /**
   * Resolves a platform user ID to a LeaveFlow tenant + employee identity.
   *
   * Returns null when no mapping exists for the platform user.
   */
  resolveUser(platformUserId: string): Promise<ResolvedUser | null>;
}
