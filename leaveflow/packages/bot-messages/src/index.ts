/**
 * @leaveflow/bot-messages — platform-agnostic bot message template package.
 *
 * Provides:
 * - Template data interfaces (types.ts)
 * - Data builder functions (templates/)
 * - Slack Block Kit renderer (slack/)
 * - Teams Adaptive Card renderer (teams/)
 */

// Types
export type {
  ApprovalRequestData,
  ApprovedNotificationData,
  RejectedNotificationData,
  StaleReminderData,
  BalanceCheckData,
  TeamAnnouncementData,
  BalanceEntry,
  ApprovalStep,
} from "./types.js";

// Template builders
export {
  buildApprovalRequestData,
  type ApprovalRequestInput,
} from "./templates/approval-request.js";
export {
  buildApprovedNotificationData,
  type ApprovedNotificationInput,
} from "./templates/approved-notification.js";
export {
  buildRejectedNotificationData,
  type RejectedNotificationInput,
} from "./templates/rejected-notification.js";
export {
  buildStaleReminderData,
  type StaleReminderInput,
} from "./templates/stale-reminder.js";
export {
  buildBalanceCheckData,
  type BalanceCheckInput,
} from "./templates/balance-check.js";
export {
  buildTeamAnnouncementData,
  type TeamAnnouncementInput,
} from "./templates/team-announcement.js";

// Slack Block Kit renderer
export {
  renderApprovalRequest as renderSlackApprovalRequest,
  renderApprovedNotification as renderSlackApprovedNotification,
  renderRejectedNotification as renderSlackRejectedNotification,
  renderStaleReminder as renderSlackStaleReminder,
  renderBalanceCheck as renderSlackBalanceCheck,
  renderTeamAnnouncement as renderSlackTeamAnnouncement,
  type SlackMessage,
} from "./slack/block-kit.renderer.js";

// Teams Adaptive Card renderer
export {
  renderApprovalRequest as renderTeamsApprovalRequest,
  renderApprovedNotification as renderTeamsApprovedNotification,
  renderRejectedNotification as renderTeamsRejectedNotification,
  renderStaleReminder as renderTeamsStaleReminder,
  renderBalanceCheck as renderTeamsBalanceCheck,
  renderTeamAnnouncement as renderTeamsTeamAnnouncement,
  type AdaptiveCard,
} from "./teams/adaptive-card.renderer.js";
