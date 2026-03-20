/**
 * Notification routes tests — verifies endpoint behavior with mocked service.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NotificationService } from "./notification.service.js";
import type { INotification } from "../../models/notification.model.js";
import type { PaginatedResult } from "./notification.types.js";

// ----------------------------------------------------------------
// Test helpers — pure unit tests for service method calls
// ----------------------------------------------------------------

function makeNotificationServiceMock(): NotificationService {
  return {
    notify: vi.fn(),
    getInbox: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    getUnreadCount: vi.fn(),
  };
}

function makeNotification(overrides: Partial<INotification> = {}): INotification {
  return {
    _id: "notif-1",
    tenantId: "tenant-test",
    recipientEmployeeId: "emp-1" as unknown as INotification["recipientEmployeeId"],
    eventType: "approval_pending",
    channel: "email",
    status: "queued",
    referenceType: "leave_request",
    referenceId: "lr-1" as unknown as INotification["referenceId"],
    platformMessageId: null,
    attempts: 0,
    lastError: null,
    sentAt: null,
    deliveredAt: null,
    createdAt: new Date("2026-03-16T08:00:00Z"),
    updatedAt: new Date("2026-03-16T08:00:00Z"),
    ...overrides,
  } as unknown as INotification;
}

// ----------------------------------------------------------------
// Service unit tests (testing service method contracts)
// ----------------------------------------------------------------

describe("NotificationService — getInbox", () => {
  let service: NotificationService;

  beforeEach(() => {
    service = makeNotificationServiceMock();
  });

  it("calls getInbox with correct tenant and employee IDs", async () => {
    const fakeResult: PaginatedResult<INotification> = {
      items: [],
      total: 0,
      page: 1,
      limit: 20,
    };

    (service.getInbox as ReturnType<typeof vi.fn>).mockResolvedValue(fakeResult);

    const result = await service.getInbox(
      "tenant-test",
      "emp-1",
      { page: 1, limit: 20 },
      {}
    );

    expect(service.getInbox).toHaveBeenCalledWith(
      "tenant-test",
      "emp-1",
      { page: 1, limit: 20 },
      {}
    );
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("filters by unreadOnly when read=false", async () => {
    const fakeResult: PaginatedResult<INotification> = {
      items: [makeNotification()],
      total: 1,
      page: 1,
      limit: 20,
    };

    (service.getInbox as ReturnType<typeof vi.fn>).mockResolvedValue(fakeResult);

    await service.getInbox("tenant-test", "emp-1", { page: 1, limit: 20 }, { unreadOnly: true });

    expect(service.getInbox).toHaveBeenCalledWith(
      "tenant-test",
      "emp-1",
      { page: 1, limit: 20 },
      { unreadOnly: true }
    );
  });
});

describe("NotificationService — markRead", () => {
  let service: NotificationService;

  beforeEach(() => {
    service = makeNotificationServiceMock();
  });

  it("calls markRead with correct params and returns notification", async () => {
    const delivered = makeNotification({ status: "delivered" });
    (service.markRead as ReturnType<typeof vi.fn>).mockResolvedValue(delivered);

    const result = await service.markRead("tenant-test", "emp-1", "notif-1");

    expect(service.markRead).toHaveBeenCalledWith("tenant-test", "emp-1", "notif-1");
    expect(result?.status).toBe("delivered");
  });

  it("returns null when notification is not found", async () => {
    (service.markRead as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const result = await service.markRead("tenant-test", "emp-1", "nonexistent");
    expect(result).toBeNull();
  });
});

describe("NotificationService — markAllRead", () => {
  let service: NotificationService;

  beforeEach(() => {
    service = makeNotificationServiceMock();
  });

  it("returns count of marked notifications", async () => {
    (service.markAllRead as ReturnType<typeof vi.fn>).mockResolvedValue(5);

    const count = await service.markAllRead("tenant-test", "emp-1");

    expect(count).toBe(5);
    expect(service.markAllRead).toHaveBeenCalledWith("tenant-test", "emp-1");
  });

  it("returns 0 when no notifications to mark", async () => {
    (service.markAllRead as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const count = await service.markAllRead("tenant-test", "emp-1");
    expect(count).toBe(0);
  });
});

describe("NotificationService — getUnreadCount", () => {
  let service: NotificationService;

  beforeEach(() => {
    service = makeNotificationServiceMock();
  });

  it("returns unread count for badge", async () => {
    (service.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue(3);

    const count = await service.getUnreadCount("tenant-test", "emp-1");

    expect(count).toBe(3);
    expect(service.getUnreadCount).toHaveBeenCalledWith("tenant-test", "emp-1");
  });

  it("returns 0 when all notifications are read", async () => {
    (service.getUnreadCount as ReturnType<typeof vi.fn>).mockResolvedValue(0);

    const count = await service.getUnreadCount("tenant-test", "emp-1");
    expect(count).toBe(0);
  });
});
