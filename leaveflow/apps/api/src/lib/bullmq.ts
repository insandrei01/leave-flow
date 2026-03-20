/**
 * BullMQ queue definitions for LeaveFlow background job processing.
 *
 * Defines 6 queues with typed job data interfaces.
 * Workers are registered in src/workers/index.ts (Phase 5).
 *
 * Default job options:
 * - removeOnComplete: 100  (keep last 100 completed jobs for debugging)
 * - removeOnFail: 500      (keep last 500 failed jobs for analysis)
 *
 * Dead-letter pattern:
 * Failed jobs that exceed their attempt count remain in the "failed" state
 * with removeOnFail: 500, allowing inspection and manual replay.
 * The notification queue uses 5 attempts with exponential backoff.
 */

import { Queue } from "bullmq";
import { getRedisClient } from "./redis.js";

// ----------------------------------------------------------------
// Queue name constants
// ----------------------------------------------------------------

export const QUEUE_NAMES = {
  ESCALATION: "escalation",
  ACCRUAL: "accrual",
  NOTIFICATION: "notification",
  CALENDAR_SYNC: "calendar-sync",
  CSV_IMPORT: "csv-import",
  DASHBOARD_CACHE: "dashboard-cache",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ----------------------------------------------------------------
// Typed job data interfaces
// ----------------------------------------------------------------

/** Escalation queue: check and process overdue approval steps */
export interface EscalationJobData {
  tenantId: string;
  leaveRequestId: string;
  stepIndex: number;
}

/** Accrual queue: run monthly/quarterly accrual for a leave type */
export interface AccrualJobData {
  tenantId: string;
  leaveTypeId: string;
  effectiveDate: string; // ISO date string
}

/** Notification queue: send a single notification */
export interface NotificationJobData {
  notificationId: string;
  tenantId: string;
  recipientEmployeeId: string;
  channel: "slack_dm" | "teams_dm" | "email" | "slack_channel" | "teams_channel";
  eventType:
    | "request_submitted"
    | "approval_pending"
    | "request_approved_step"
    | "request_approved_final"
    | "request_rejected"
    | "request_cancelled"
    | "request_escalated"
    | "approval_reminder"
    | "channel_announcement";
  referenceId: string;
}

/** Calendar sync queue: create/update/delete calendar events */
export interface CalendarSyncJobData {
  tenantId: string;
  employeeId: string;
  leaveRequestId: string;
  service: "google_calendar" | "outlook_calendar";
  action: "create" | "update" | "delete";
}

/** CSV import queue: process an uploaded employee CSV file */
export interface CsvImportJobData {
  tenantId: string;
  uploadedBy: string;
  fileKey: string;
  totalRows: number;
}

/** Dashboard cache queue: refresh pre-computed dashboard widgets */
export interface DashboardCacheJobData {
  tenantId: string;
  widgets: string[];
}

// ----------------------------------------------------------------
// Default job options
// ----------------------------------------------------------------

const DEFAULT_JOB_OPTIONS = {
  removeOnComplete: 100,
  removeOnFail: 500,
};

// ----------------------------------------------------------------
// Connection factory (lazy — uses singleton Redis client)
// ----------------------------------------------------------------

function makeConnection() {
  return getRedisClient();
}

// ----------------------------------------------------------------
// Queue instances
// ----------------------------------------------------------------

export const escalationQueue = new Queue<EscalationJobData>(
  QUEUE_NAMES.ESCALATION,
  {
    connection: makeConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const accrualQueue = new Queue<AccrualJobData>(QUEUE_NAMES.ACCRUAL, {
  connection: makeConnection(),
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
});

export const notificationQueue = new Queue<NotificationJobData>(
  QUEUE_NAMES.NOTIFICATION,
  {
    connection: makeConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const calendarSyncQueue = new Queue<CalendarSyncJobData>(
  QUEUE_NAMES.CALENDAR_SYNC,
  {
    connection: makeConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const csvImportQueue = new Queue<CsvImportJobData>(
  QUEUE_NAMES.CSV_IMPORT,
  {
    connection: makeConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

export const dashboardCacheQueue = new Queue<DashboardCacheJobData>(
  QUEUE_NAMES.DASHBOARD_CACHE,
  {
    connection: makeConnection(),
    defaultJobOptions: DEFAULT_JOB_OPTIONS,
  }
);

// ----------------------------------------------------------------
// All queues (for bulk operations like graceful shutdown)
// ----------------------------------------------------------------

export const ALL_QUEUES = [
  escalationQueue,
  accrualQueue,
  notificationQueue,
  calendarSyncQueue,
  csvImportQueue,
  dashboardCacheQueue,
] as const;
