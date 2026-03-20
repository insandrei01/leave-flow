/**
 * Notification module — routes events to the correct delivery channel(s).
 *
 * This module only ENQUEUES BullMQ jobs. It does not deliver.
 * Delivery workers are implemented in Phase 5.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { notificationRoutes } from "./notification.routes.js";

async function registerNotificationPlugin(app: FastifyInstance): Promise<void> {
  await app.register(notificationRoutes);
}

export const notifications = fp(registerNotificationPlugin, {
  name: "notification-plugin",
  fastify: "5.x",
});

export { createNotificationRepository } from "./notification.repository.js";
export type {
  NotificationRepository,
  CreateNotificationInput,
} from "./notification.repository.js";

export { createNotificationService } from "./notification.service.js";
export type {
  NotificationService,
  NotificationServiceDeps,
  BotConnectionChecker,
} from "./notification.service.js";

export type {
  NotifyInput,
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
  NotificationReferenceType,
  PaginationInput,
  PaginatedResult,
  InboxFilters,
  DeliveryStatusUpdate,
  EmployeeChannelPreferences,
} from "./notification.types.js";
