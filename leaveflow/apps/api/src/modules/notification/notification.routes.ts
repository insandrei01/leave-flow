/**
 * Notification routes — per-employee notification inbox.
 *
 * GET    /notifications               — paginated inbox for current user
 * PATCH  /notifications/:id/read     — mark single notification as read
 * PATCH  /notifications/read-all     — mark all as read
 * GET    /notifications/unread-count — badge count
 *
 * All routes are scoped to the authenticated employee.
 * Employees only see their own notifications.
 */

import type { FastifyInstance } from "fastify";
import { createNotificationRepository } from "./notification.repository.js";
import { createNotificationService } from "./notification.service.js";
import {
  NotificationsQuerySchema,
  NotificationIdParamsSchema,
} from "./notification.schema.js";
import { sendSuccess, sendPaginated } from "../../lib/response.js";
import { NotFoundError, ValidationError, UnauthorizedError } from "../../lib/errors.js";

// No real queue needed for reading — pass a minimal stub
const noopQueue = {
  add: async () => null,
} as Parameters<typeof createNotificationService>[0]["notificationQueue"];

// No real bot checker needed for reading — pass a minimal stub
const noopBotChecker = {
  getPlatformConnections: async () => [] as Array<"slack" | "teams">,
} as Parameters<typeof createNotificationService>[0]["botChecker"];

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  const repo = createNotificationRepository();
  const service = createNotificationService({
    repo,
    notificationQueue: noopQueue,
    botChecker: noopBotChecker,
  });

  /**
   * GET /notifications
   * Paginated notification inbox for the current user.
   * Auth: any authenticated role
   */
  app.get("/notifications", async (request, reply) => {
    const employeeId = request.auth?.employeeId;
    if (employeeId === undefined) {
      throw new UnauthorizedError("Authentication required");
    }

    const parsed = NotificationsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.issues);
    }

    const { read, page, limit } = parsed.data;
    const tenantId = request.tenantId ?? "";

    const filters =
      read !== undefined ? { unreadOnly: !read } : {};

    const result = await service.getInbox(tenantId, employeeId, { page, limit }, filters);

    const serialized = result.items.map((n) => ({
      notificationId: String(n._id),
      type: n.eventType,
      channel: n.channel,
      entityType: n.referenceType,
      entityId: String(n.referenceId),
      isRead: n.status === "delivered",
      createdAt: n.createdAt.toISOString(),
    }));

    return sendPaginated(reply, serialized, {
      total: result.total,
      page: result.page,
      limit: result.limit,
    });
  });

  /**
   * GET /notifications/unread-count
   * Returns unread badge count for the current user.
   * Note: must be registered BEFORE /:id routes to avoid conflict.
   */
  app.get("/notifications/unread-count", async (request, reply) => {
    const employeeId = request.auth?.employeeId;
    if (employeeId === undefined) {
      throw new UnauthorizedError("Authentication required");
    }

    const tenantId = request.tenantId ?? "";
    const count = await service.getUnreadCount(tenantId, employeeId);

    return sendSuccess(reply, { count });
  });

  /**
   * PATCH /notifications/read-all
   * Mark all notifications as read for the current user.
   */
  app.patch("/notifications/read-all", async (request, reply) => {
    const employeeId = request.auth?.employeeId;
    if (employeeId === undefined) {
      throw new UnauthorizedError("Authentication required");
    }

    const tenantId = request.tenantId ?? "";
    const markedRead = await service.markAllRead(tenantId, employeeId);

    return sendSuccess(reply, { markedRead });
  });

  /**
   * PATCH /notifications/:id/read
   * Mark a single notification as read.
   */
  app.patch("/notifications/:id/read", async (request, reply) => {
    const employeeId = request.auth?.employeeId;
    if (employeeId === undefined) {
      throw new UnauthorizedError("Authentication required");
    }

    const parsed = NotificationIdParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      throw new ValidationError("Invalid notification ID", parsed.error.issues);
    }

    const { id } = parsed.data;
    const tenantId = request.tenantId ?? "";

    const notification = await service.markRead(tenantId, employeeId, id);
    if (notification === null) {
      throw new NotFoundError("Notification", id);
    }

    return sendSuccess(reply, {
      notificationId: id,
      isRead: notification.status === "delivered",
    });
  });
}
