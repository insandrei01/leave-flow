/**
 * Notification model — delivery tracking for all outbound notifications.
 *
 * Used for retry logic and delivery status display.
 * Includes a TTL index to auto-delete after 90 days.
 *
 * BullMQ handles job execution and retry. This collection provides a
 * persistent delivery log for the UI and for updating bot messages on
 * cancellation (needs platformMessageId).
 *
 * Tenant-scoped: tenantId guard middleware is applied.
 */

import mongoose, { Schema, type Document } from "mongoose";
import { requireTenantIdPlugin } from "./plugins/require-tenant-id.js";

// ----------------------------------------------------------------
// Type definitions
// ----------------------------------------------------------------

export type NotificationEventType =
  | "request_submitted"
  | "approval_pending"
  | "request_approved_step"
  | "request_approved_final"
  | "request_rejected"
  | "request_cancelled"
  | "request_escalated"
  | "approval_reminder"
  | "channel_announcement";

export type NotificationChannel =
  | "slack_dm"
  | "teams_dm"
  | "email"
  | "slack_channel"
  | "teams_channel";

export type NotificationStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "failed"
  | "retry";

export type NotificationReferenceType = "leave_request" | "delegation";

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface INotification extends Document {
  tenantId: string;
  recipientEmployeeId: mongoose.Types.ObjectId;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  status: NotificationStatus;
  referenceType: NotificationReferenceType;
  referenceId: mongoose.Types.ObjectId;
  platformMessageId: string | null;
  attempts: number;
  lastError: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const NotificationSchema = new Schema<INotification>(
  {
    tenantId: { type: String, required: true },
    recipientEmployeeId: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    eventType: {
      type: String,
      enum: [
        "request_submitted",
        "approval_pending",
        "request_approved_step",
        "request_approved_final",
        "request_rejected",
        "request_cancelled",
        "request_escalated",
        "approval_reminder",
        "channel_announcement",
      ],
      required: true,
    },
    channel: {
      type: String,
      enum: [
        "slack_dm",
        "teams_dm",
        "email",
        "slack_channel",
        "teams_channel",
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["queued", "sent", "delivered", "failed", "retry"],
      required: true,
    },
    referenceType: {
      type: String,
      enum: ["leave_request", "delegation"],
      required: true,
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    platformMessageId: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "notifications",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// tenant_recipient_event — notification history for an employee
NotificationSchema.index(
  { tenantId: 1, recipientEmployeeId: 1, eventType: 1, createdAt: -1 },
  { name: "tenant_recipient_event" }
);
// tenant_reference — find all notifications for a specific request (BR-065)
NotificationSchema.index(
  { tenantId: 1, referenceType: 1, referenceId: 1 },
  { name: "tenant_reference" }
);
// retry_queue — notification retry worker: find failed/queued notifications
NotificationSchema.index(
  { status: 1, createdAt: 1 },
  { name: "retry_queue" }
);
// platform_message — update existing bot messages (e.g., mark approval card as "cancelled")
NotificationSchema.index(
  { platformMessageId: 1, channel: 1 },
  { sparse: true, name: "platform_message" }
);
// TTL index — auto-delete notifications after 90 days
NotificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60, name: "ttl_90_days" }
);

// ----------------------------------------------------------------
// Middleware
// ----------------------------------------------------------------

NotificationSchema.plugin(requireTenantIdPlugin);

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const NotificationModel =
  (mongoose.models["Notification"] as
    | mongoose.Model<INotification>
    | undefined) ??
  mongoose.model<INotification>("Notification", NotificationSchema);
