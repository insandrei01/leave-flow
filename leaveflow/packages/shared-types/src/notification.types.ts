/**
 * Notification types — delivery tracking log for retry and UI display.
 */

export type NotificationEventType =
  | 'request_submitted'
  | 'approval_pending'
  | 'request_approved_step'
  | 'request_approved_final'
  | 'request_rejected'
  | 'request_cancelled'
  | 'request_escalated'
  | 'approval_reminder'
  | 'channel_announcement';

export type NotificationChannel =
  | 'slack_dm'
  | 'teams_dm'
  | 'email'
  | 'slack_channel'
  | 'teams_channel';

export type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'retry';

export type NotificationReferenceType = 'leave_request' | 'delegation';

export interface Notification {
  readonly _id: string;
  readonly tenantId: string;
  readonly recipientEmployeeId: string;
  readonly eventType: NotificationEventType;
  readonly channel: NotificationChannel;
  readonly status: NotificationStatus;
  readonly referenceType: NotificationReferenceType;
  readonly referenceId: string;
  /** Slack ts or Teams activityId — used to update bot messages on cancellation. */
  readonly platformMessageId: string | null;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly sentAt: string | null;
  readonly deliveredAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
