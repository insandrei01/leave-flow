/**
 * Notification service — routes notifications to the correct channel(s).
 *
 * This service ONLY enqueues BullMQ jobs. It does NOT deliver.
 * Delivery workers are implemented in Phase 5.
 *
 * Channel selection logic:
 * 1. Always create an in-app notification record (channel: "email" as the
 *    in-app record — the channel field on the in-app record represents the
 *    primary delivery channel for reference).
 * 2. If the employee has a Slack bot mapping → enqueue slack_dm job.
 * 3. If the employee has a Teams bot mapping → enqueue teams_dm job.
 * 4. If no platform connection → enqueue email job (fallback).
 */

import type { Queue } from "bullmq";
import type { INotification } from "../../models/notification.model.js";
import type { NotificationRepository } from "./notification.repository.js";
import type {
  NotifyInput,
  NotificationEventType,
  NotificationChannel,
  PaginationInput,
  PaginatedResult,
  InboxFilters,
} from "./notification.types.js";
import type { NotificationJobData } from "../../lib/bullmq.js";

// ----------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------

export interface BotConnectionChecker {
  /**
   * Returns the set of platforms (slack/teams) the employee has connected.
   * Returns an empty array when no platform is connected.
   */
  getPlatformConnections(
    tenantId: string,
    employeeId: string
  ): Promise<Array<"slack" | "teams">>;
}

export interface NotificationServiceDeps {
  repo: NotificationRepository;
  notificationQueue: Queue<NotificationJobData>;
  botChecker: BotConnectionChecker;
}

// ----------------------------------------------------------------
// Service type
// ----------------------------------------------------------------

export interface NotificationService {
  notify(input: NotifyInput): Promise<INotification>;
  getInbox(
    tenantId: string,
    employeeId: string,
    pagination: PaginationInput,
    filters?: InboxFilters
  ): Promise<PaginatedResult<INotification>>;
  markRead(
    tenantId: string,
    employeeId: string,
    notificationId: string
  ): Promise<INotification | null>;
  markAllRead(tenantId: string, employeeId: string): Promise<number>;
  getUnreadCount(tenantId: string, employeeId: string): Promise<number>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createNotificationService(
  deps: NotificationServiceDeps
): NotificationService {
  const { repo, notificationQueue, botChecker } = deps;

  return {
    /**
     * Route a notification to the correct channel(s).
     *
     * Steps:
     * 1. Determine which platform(s) the employee has connected.
     * 2. Create an in-app notification record (canonical record).
     * 3. Enqueue one BullMQ job per external channel.
     * 4. Fall back to email if no platform is connected.
     */
    async notify(input: NotifyInput): Promise<INotification> {
      const { tenantId, recipientEmployeeId, eventType, referenceType, referenceId } =
        input;

      // Determine platform connections
      const platforms = await botChecker.getPlatformConnections(
        tenantId,
        recipientEmployeeId
      );

      // Determine the primary in-app channel for the record
      const primaryChannel = resolvePrimaryChannel(platforms);

      // Create the canonical in-app notification record
      const notification = await repo.create({
        tenantId,
        recipientEmployeeId,
        eventType,
        channel: primaryChannel,
        referenceType,
        referenceId,
        status: "queued",
      });

      const notificationId = String(notification._id);

      // Enqueue BullMQ job(s) for external delivery
      const channels = resolveChannels(platforms);

      await Promise.all(
        channels.map((channel) =>
          notificationQueue.add(
            buildJobName(eventType, channel),
            {
              notificationId,
              tenantId,
              recipientEmployeeId,
              channel,
              eventType,
              referenceId,
            },
            { attempts: 3, backoff: { type: "exponential", delay: 5_000 } }
          )
        )
      );

      return notification;
    },

    /**
     * Returns paginated notifications for an employee's inbox.
     */
    async getInbox(
      tenantId: string,
      employeeId: string,
      pagination: PaginationInput,
      filters: InboxFilters = {}
    ): Promise<PaginatedResult<INotification>> {
      return repo.findByEmployee(tenantId, employeeId, pagination, filters);
    },

    /**
     * Mark a single notification as read (delivered).
     */
    async markRead(
      tenantId: string,
      _employeeId: string,
      notificationId: string
    ): Promise<INotification | null> {
      return repo.markRead(tenantId, notificationId);
    },

    /**
     * Mark all notifications for an employee as read.
     */
    async markAllRead(tenantId: string, employeeId: string): Promise<number> {
      return repo.markAllRead(tenantId, employeeId);
    },

    /**
     * Returns the unread count for a badge in the UI.
     */
    async getUnreadCount(tenantId: string, employeeId: string): Promise<number> {
      return repo.countUnread(tenantId, employeeId);
    },
  };
}

// ----------------------------------------------------------------
// Private helpers (pure — no side effects)
// ----------------------------------------------------------------

/**
 * Determine which BullMQ delivery channels to enqueue.
 * Falls back to email if no platform connection exists.
 */
function resolveChannels(
  platforms: Array<"slack" | "teams">
): NotificationChannel[] {
  if (platforms.length === 0) {
    return ["email"];
  }

  return platforms.map((p): NotificationChannel => {
    if (p === "slack") return "slack_dm";
    return "teams_dm";
  });
}

/**
 * Determine the primary channel label for the in-app notification record.
 * The in-app record mirrors the primary external channel so cancellation
 * updates can locate the platform message via platformMessageId.
 */
function resolvePrimaryChannel(
  platforms: Array<"slack" | "teams">
): NotificationChannel {
  if (platforms.length === 0) return "email";
  if (platforms[0] === "slack") return "slack_dm";
  if (platforms[0] === "teams") return "teams_dm";
  return "email";
}

function buildJobName(
  eventType: NotificationEventType,
  channel: NotificationChannel
): string {
  return `${eventType}:${channel}`;
}
