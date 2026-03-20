/**
 * Notification repository — data access for the notifications collection.
 *
 * tenantId is always the first parameter on query methods.
 */

import mongoose from "mongoose";
import {
  NotificationModel,
  type INotification,
} from "../../models/notification.model.js";
import type {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
  NotificationReferenceType,
  PaginationInput,
  PaginatedResult,
  InboxFilters,
  DeliveryStatusUpdate,
} from "./notification.types.js";

// ----------------------------------------------------------------
// Create input type
// ----------------------------------------------------------------

export interface CreateNotificationInput {
  tenantId: string;
  recipientEmployeeId: string;
  eventType: NotificationEventType;
  channel: NotificationChannel;
  referenceType: NotificationReferenceType;
  referenceId: string;
  status?: NotificationStatus;
}

// ----------------------------------------------------------------
// Repository type
// ----------------------------------------------------------------

export interface NotificationRepository {
  create(input: CreateNotificationInput): Promise<INotification>;
  findByEmployee(
    tenantId: string,
    employeeId: string,
    pagination: PaginationInput,
    filters?: InboxFilters
  ): Promise<PaginatedResult<INotification>>;
  markRead(tenantId: string, notificationId: string): Promise<INotification | null>;
  markAllRead(tenantId: string, employeeId: string): Promise<number>;
  countUnread(tenantId: string, employeeId: string): Promise<number>;
  updateDeliveryStatus(
    tenantId: string,
    id: string,
    update: DeliveryStatusUpdate
  ): Promise<INotification | null>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createNotificationRepository(): NotificationRepository {
  return {
    /**
     * Persist a new notification record.
     */
    async create(input: CreateNotificationInput): Promise<INotification> {
      const doc = new NotificationModel({
        tenantId: input.tenantId,
        recipientEmployeeId: new mongoose.Types.ObjectId(input.recipientEmployeeId),
        eventType: input.eventType,
        channel: input.channel,
        status: input.status ?? "queued",
        referenceType: input.referenceType,
        referenceId: new mongoose.Types.ObjectId(input.referenceId),
        platformMessageId: null,
        attempts: 0,
        lastError: null,
        sentAt: null,
        deliveredAt: null,
      });

      return doc.save();
    },

    /**
     * Returns paginated notifications for an employee's inbox.
     * Sorted newest-first.
     */
    async findByEmployee(
      tenantId: string,
      employeeId: string,
      pagination: PaginationInput,
      filters: InboxFilters = {}
    ): Promise<PaginatedResult<INotification>> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const query: Record<string, unknown> = {
        tenantId,
        recipientEmployeeId: new mongoose.Types.ObjectId(employeeId),
      };

      if (filters.eventType !== undefined) {
        query["eventType"] = filters.eventType;
      }

      // "unread" is represented by status === "queued" (in-app) or "sent"
      // For simplicity we treat any non-delivered status as potentially unread.
      // The in-app channel uses status="delivered" when the user has viewed it.
      if (filters.unreadOnly === true) {
        query["status"] = { $nin: ["delivered"] };
      }

      const [items, total] = await Promise.all([
        NotificationModel.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<INotification[]>(),
        NotificationModel.countDocuments(query),
      ]);

      return { items, total, page, limit };
    },

    /**
     * Mark a single notification as delivered (read).
     */
    async markRead(tenantId: string, notificationId: string): Promise<INotification | null> {
      return NotificationModel.findOneAndUpdate(
        { _id: notificationId, tenantId },
        { $set: { status: "delivered", deliveredAt: new Date() } },
        { new: true }
      ).lean<INotification>();
    },

    /**
     * Mark all notifications for an employee as delivered.
     * Returns the count of updated documents.
     */
    async markAllRead(tenantId: string, employeeId: string): Promise<number> {
      const result = await NotificationModel.updateMany(
        {
          tenantId,
          recipientEmployeeId: new mongoose.Types.ObjectId(employeeId),
          status: { $nin: ["delivered"] },
        },
        { $set: { status: "delivered", deliveredAt: new Date() } }
      );

      return result.modifiedCount;
    },

    /**
     * Returns the number of unread (non-delivered) notifications for a badge.
     */
    async countUnread(tenantId: string, employeeId: string): Promise<number> {
      return NotificationModel.countDocuments({
        tenantId,
        recipientEmployeeId: new mongoose.Types.ObjectId(employeeId),
        status: { $nin: ["delivered"] },
      });
    },

    /**
     * Update delivery status after a BullMQ worker processes the job.
     */
    async updateDeliveryStatus(
      tenantId: string,
      id: string,
      update: DeliveryStatusUpdate
    ): Promise<INotification | null> {
      const fields: Record<string, unknown> = { status: update.status };

      if (update.platformMessageId !== undefined) {
        fields["platformMessageId"] = update.platformMessageId;
      }

      if (update.lastError !== undefined) {
        fields["lastError"] = update.lastError;
      }

      if (update.status === "sent" || update.status === "delivered") {
        fields["sentAt"] = new Date();
      }

      if (update.status === "delivered") {
        fields["deliveredAt"] = new Date();
      }

      return NotificationModel.findOneAndUpdate(
        { _id: id, tenantId },
        { $set: fields, $inc: { attempts: 1 } },
        { new: true }
      ).lean<INotification>();
    },
  };
}
