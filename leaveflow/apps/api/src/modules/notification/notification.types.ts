/**
 * Types for the Notification module.
 *
 * The notification service only enqueues BullMQ jobs — it does NOT deliver.
 * Delivery happens in Phase 5 workers.
 */

import type {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
  NotificationReferenceType,
} from "../../models/notification.model.js";

// Re-export model types for convenience
export type {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
  NotificationReferenceType,
};

// ----------------------------------------------------------------
// Service input types
// ----------------------------------------------------------------

export interface NotifyInput {
  tenantId: string;
  recipientEmployeeId: string;
  eventType: NotificationEventType;
  referenceType: NotificationReferenceType;
  referenceId: string;
  /** Optional per-event payload (rendered into the notification message). */
  payload?: Record<string, unknown>;
}

// ----------------------------------------------------------------
// Employee notification preferences (resolved at call time)
// ----------------------------------------------------------------

export interface EmployeeChannelPreferences {
  employeeId: string;
  primaryPlatform: "slack" | "teams" | "email";
  /** Whether the employee has a connected Slack workspace. */
  hasSlackConnection: boolean;
  /** Whether the employee has a connected Teams tenant. */
  hasTeamsConnection: boolean;
}

// ----------------------------------------------------------------
// Pagination
// ----------------------------------------------------------------

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ----------------------------------------------------------------
// Inbox filters
// ----------------------------------------------------------------

export interface InboxFilters {
  unreadOnly?: boolean;
  eventType?: NotificationEventType;
}

// ----------------------------------------------------------------
// Delivery status update
// ----------------------------------------------------------------

export interface DeliveryStatusUpdate {
  status: NotificationStatus;
  platformMessageId?: string | null;
  lastError?: string | null;
}
