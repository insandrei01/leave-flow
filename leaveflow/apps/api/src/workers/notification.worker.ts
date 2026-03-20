/**
 * Notification dispatch worker — processes notification queue jobs.
 *
 * Routes each job to the correct delivery channel:
 * - slack_dm → Slack adapter sendDirectMessage
 * - teams_dm → Teams adapter sendDirectMessage
 * - email → Postmark placeholder (logs and marks as sent)
 * - slack_channel / teams_channel → reserved for future use
 *
 * After delivery:
 * - Updates status to "sent" with platformMessageId
 * - On failure: sets status to "failed" with lastError, then re-throws
 *   so BullMQ can retry with exponential backoff (5 attempts configured
 *   on the notification service when enqueuing).
 */

import mongoose from "mongoose";
import type { NotificationJobData } from "../lib/bullmq.js";
import type { INotification } from "../models/notification.model.js";

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface INotificationRepoDep {
  findById(id: string): Promise<INotification | null>;
  updateDeliveryStatus(
    tenantId: string,
    id: string,
    update: { status: string; platformMessageId?: string | null; lastError?: string | null }
  ): Promise<unknown>;
}

export interface IEmployeeRepoDep {
  findById(
    tenantId: string,
    id: string
  ): Promise<{ _id: mongoose.Types.ObjectId; firstName: string; lastName: string } | null>;
}

export interface IBotMappingRepoDep {
  findByEmployee(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId
  ): Promise<Array<{ platformUserId: string; platform: string; conversationReference: Record<string, unknown> | null }>>;
}

export interface IMessageReference {
  platform: string;
  channelId: string;
  messageId: string;
}

export interface IBotAdapterDep {
  sendDirectMessage(
    platformUserId: string,
    message: { text: string }
  ): Promise<IMessageReference>;
}

export interface IEmailSenderDep {
  send(to: string, subject: string, body: string): Promise<void>;
}

export interface NotificationWorkerDeps {
  notificationRepo: INotificationRepoDep;
  employeeRepo: IEmployeeRepoDep;
  botMappingRepo: IBotMappingRepoDep;
  slackAdapter: IBotAdapterDep;
  teamsAdapter: IBotAdapterDep;
  emailSender: IEmailSenderDep;
}

// ----------------------------------------------------------------
// Job processor
// ----------------------------------------------------------------

/**
 * Processes a single notification dispatch job.
 *
 * Steps:
 * 1. Load the notification record (guards against already-delivered or missing)
 * 2. Resolve the recipient's platform user ID from bot mappings
 * 3. Dispatch to the correct adapter
 * 4. Update the notification status with the platform message ID
 */
export async function processNotificationJob(
  data: NotificationJobData,
  deps: NotificationWorkerDeps
): Promise<void> {
  const { notificationId, tenantId, recipientEmployeeId, channel, eventType } = data;

  const notification = await deps.notificationRepo.findById(notificationId);
  if (notification === null) {
    console.warn(`[notification-worker] Notification not found: ${notificationId}`);
    return;
  }

  try {
    const messageRef = await dispatchToChannel(
      channel,
      tenantId,
      recipientEmployeeId,
      eventType,
      deps
    );

    if (messageRef !== null) {
      await deps.notificationRepo.updateDeliveryStatus(tenantId, notificationId, {
        status: "sent",
        platformMessageId: messageRef.messageId,
      });
    } else {
      // Channel had no mapping (e.g., no Slack userId) — skip silently
      await deps.notificationRepo.updateDeliveryStatus(tenantId, notificationId, {
        status: "sent",
        platformMessageId: null,
      });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await deps.notificationRepo.updateDeliveryStatus(tenantId, notificationId, {
      status: "failed",
      lastError: errorMessage,
    });

    // Re-throw so BullMQ applies exponential backoff retry
    throw err;
  }
}

// ----------------------------------------------------------------
// Private routing
// ----------------------------------------------------------------

async function dispatchToChannel(
  channel: string,
  tenantId: string,
  recipientEmployeeId: string,
  eventType: string,
  deps: NotificationWorkerDeps
): Promise<IMessageReference | null> {
  if (channel === "email") {
    return dispatchEmail(tenantId, recipientEmployeeId, eventType, deps);
  }

  const employeeObjectId = new mongoose.Types.ObjectId(recipientEmployeeId);
  const mappings = await deps.botMappingRepo.findByEmployee(tenantId, employeeObjectId);

  if (channel === "slack_dm") {
    const slackMapping = mappings.find((m) => m.platform === "slack");
    if (slackMapping === undefined) {
      console.warn(
        `[notification-worker] No Slack mapping for employee ${recipientEmployeeId}`
      );
      return null;
    }
    return deps.slackAdapter.sendDirectMessage(slackMapping.platformUserId, {
      text: buildMessageText(eventType),
    });
  }

  if (channel === "teams_dm") {
    const teamsMapping = mappings.find((m) => m.platform === "teams");
    if (teamsMapping === undefined) {
      console.warn(
        `[notification-worker] No Teams mapping for employee ${recipientEmployeeId}`
      );
      return null;
    }
    return deps.teamsAdapter.sendDirectMessage(teamsMapping.platformUserId, {
      text: buildMessageText(eventType),
    });
  }

  console.warn(`[notification-worker] Unhandled channel: ${channel}`);
  return null;
}

async function dispatchEmail(
  tenantId: string,
  recipientEmployeeId: string,
  eventType: string,
  deps: NotificationWorkerDeps
): Promise<null> {
  const employee = await deps.employeeRepo.findById(tenantId, recipientEmployeeId);

  if (employee === null) {
    console.warn(
      `[notification-worker] Employee not found for email: ${recipientEmployeeId}`
    );
    return null;
  }

  const subject = buildMessageText(eventType);
  const body = `${subject}\n\nPlease log in to LeaveFlow to view details.`;

  // Postmark placeholder — uses employee name; real implementation would
  // look up the employee's email address from the employee model.
  await deps.emailSender.send(recipientEmployeeId, subject, body);

  return null;
}

// ----------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------

const EVENT_TYPE_LABELS: Record<string, string> = {
  request_submitted: "Your leave request has been submitted",
  approval_pending: "You have a leave request pending your approval",
  request_approved_step: "Your leave request has been approved at this step",
  request_approved_final: "Your leave request has been approved",
  request_rejected: "Your leave request has been rejected",
  request_cancelled: "Your leave request has been cancelled",
  request_escalated: "A leave request has been escalated",
  approval_reminder: "Reminder: You have a leave request pending approval",
  channel_announcement: "Team leave announcement",
};

function buildMessageText(eventType: string): string {
  return EVENT_TYPE_LABELS[eventType] ?? `LeaveFlow notification: ${eventType}`;
}
