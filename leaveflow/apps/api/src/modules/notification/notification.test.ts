/**
 * Notification module tests — repository and service.
 *
 * Repository tests use mongodb-memory-server.
 * Service tests use mocked dependencies (repo, queue, botChecker).
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
  type MockedFunction,
} from "vitest";
import mongoose from "mongoose";

import {
  setupTestDb,
  teardownTestDb,
  clearAllCollections,
} from "../../../test/helpers/db.helper.js";

import {
  createNotificationRepository,
  type NotificationRepository,
  type CreateNotificationInput,
} from "./notification.repository.js";
import {
  createNotificationService,
  type NotificationServiceDeps,
  type BotConnectionChecker,
} from "./notification.service.js";
import type { INotification } from "../../models/notification.model.js";
import type { PaginatedResult } from "./notification.types.js";
import type { Queue } from "bullmq";
import type { NotificationJobData } from "../../lib/bullmq.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const TENANT_A = "tenant-notify-a";
const EMPLOYEE_ID = new mongoose.Types.ObjectId().toString();
const REFERENCE_ID = new mongoose.Types.ObjectId().toString();

function makeCreateInput(
  overrides: Partial<CreateNotificationInput> = {}
): CreateNotificationInput {
  return {
    tenantId: TENANT_A,
    recipientEmployeeId: EMPLOYEE_ID,
    eventType: "request_submitted",
    channel: "email",
    referenceType: "leave_request",
    referenceId: REFERENCE_ID,
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Repository integration tests
// ----------------------------------------------------------------

describe("NotificationRepository", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearAllCollections();
  });

  describe("create", () => {
    it("creates a notification with status 'queued'", async () => {
      const repo = createNotificationRepository();
      const notif = await repo.create(makeCreateInput());

      expect(notif._id).toBeDefined();
      expect(notif.tenantId).toBe(TENANT_A);
      expect(notif.status).toBe("queued");
      expect(notif.channel).toBe("email");
      expect(notif.attempts).toBe(0);
    });

    it("accepts a custom status", async () => {
      const repo = createNotificationRepository();
      const notif = await repo.create(makeCreateInput({ status: "sent" }));

      expect(notif.status).toBe("sent");
    });
  });

  describe("findByEmployee", () => {
    it("returns only notifications for the given employee", async () => {
      const repo = createNotificationRepository();
      const otherId = new mongoose.Types.ObjectId().toString();

      await repo.create(makeCreateInput());
      await repo.create(makeCreateInput({ recipientEmployeeId: otherId }));

      const result = await repo.findByEmployee(TENANT_A, EMPLOYEE_ID, {
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(
        result.items.every(
          (n) => String(n.recipientEmployeeId) === EMPLOYEE_ID
        )
      ).toBe(true);
    });

    it("returns results newest-first", async () => {
      const repo = createNotificationRepository();

      for (let i = 0; i < 3; i++) {
        await repo.create(makeCreateInput());
        await new Promise((r) => setTimeout(r, 2));
      }

      const result = await repo.findByEmployee(TENANT_A, EMPLOYEE_ID, {
        page: 1,
        limit: 10,
      });

      const createdAts = result.items.map((n) => n.createdAt.getTime());
      expect(createdAts[0]).toBeGreaterThanOrEqual(createdAts[1] ?? 0);
    });

    it("paginates correctly", async () => {
      const repo = createNotificationRepository();
      for (let i = 0; i < 5; i++) {
        await repo.create(makeCreateInput());
      }

      const page1 = await repo.findByEmployee(TENANT_A, EMPLOYEE_ID, {
        page: 1,
        limit: 3,
      });
      const page2 = await repo.findByEmployee(TENANT_A, EMPLOYEE_ID, {
        page: 2,
        limit: 3,
      });

      expect(page1.items).toHaveLength(3);
      expect(page2.items).toHaveLength(2);
      expect(page1.total).toBe(5);
    });
  });

  describe("markRead", () => {
    it("sets status to 'delivered' and sets deliveredAt", async () => {
      const repo = createNotificationRepository();
      const notif = await repo.create(makeCreateInput());

      const updated = await repo.markRead(TENANT_A, String(notif._id));

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("delivered");
      expect(updated!.deliveredAt).toBeInstanceOf(Date);
    });

    it("returns null for unknown id", async () => {
      const repo = createNotificationRepository();
      const fakeId = new mongoose.Types.ObjectId().toString();

      const result = await repo.markRead(TENANT_A, fakeId);
      expect(result).toBeNull();
    });
  });

  describe("markAllRead", () => {
    it("marks all unread notifications as delivered", async () => {
      const repo = createNotificationRepository();
      for (let i = 0; i < 4; i++) {
        await repo.create(makeCreateInput());
      }

      const count = await repo.markAllRead(TENANT_A, EMPLOYEE_ID);
      expect(count).toBe(4);

      const unread = await repo.countUnread(TENANT_A, EMPLOYEE_ID);
      expect(unread).toBe(0);
    });
  });

  describe("countUnread", () => {
    it("returns correct unread count", async () => {
      const repo = createNotificationRepository();
      await repo.create(makeCreateInput());
      await repo.create(makeCreateInput());
      const read = await repo.create(makeCreateInput());
      await repo.markRead(TENANT_A, String(read._id));

      const count = await repo.countUnread(TENANT_A, EMPLOYEE_ID);
      expect(count).toBe(2);
    });
  });

  describe("updateDeliveryStatus", () => {
    it("updates status and increments attempts", async () => {
      const repo = createNotificationRepository();
      const notif = await repo.create(makeCreateInput());

      const updated = await repo.updateDeliveryStatus(TENANT_A, String(notif._id), {
        status: "sent",
        platformMessageId: "slack-msg-123",
      });

      expect(updated).not.toBeNull();
      expect(updated!.status).toBe("sent");
      expect(updated!.platformMessageId).toBe("slack-msg-123");
      expect(updated!.attempts).toBe(1);
    });
  });
});

// ----------------------------------------------------------------
// Service unit tests (all dependencies mocked)
// ----------------------------------------------------------------

describe("NotificationService", () => {
  function makeQueueMock(): Queue<NotificationJobData> {
    return {
      add: vi.fn().mockResolvedValue({ id: "job-1" }),
    } as unknown as Queue<NotificationJobData>;
  }

  function makeRepoMock(): NotificationRepository {
    return {
      create: vi.fn(),
      findByEmployee: vi.fn(),
      markRead: vi.fn(),
      markAllRead: vi.fn(),
      countUnread: vi.fn(),
      updateDeliveryStatus: vi.fn(),
    };
  }

  function makeBotChecker(
    platforms: Array<"slack" | "teams"> = []
  ): BotConnectionChecker {
    return {
      getPlatformConnections: vi.fn().mockResolvedValue(platforms),
    };
  }

  function makeService(
    overrides: Partial<NotificationServiceDeps> = {}
  ) {
    const repo = overrides.repo ?? makeRepoMock();
    const notificationQueue = overrides.notificationQueue ?? makeQueueMock();
    const botChecker = overrides.botChecker ?? makeBotChecker();

    return {
      service: createNotificationService({ repo, notificationQueue, botChecker }),
      repo,
      notificationQueue,
      botChecker,
    };
  }

  const fakeNotification: INotification = {
    _id: new mongoose.Types.ObjectId(),
    tenantId: TENANT_A,
    recipientEmployeeId: new mongoose.Types.ObjectId(EMPLOYEE_ID),
    eventType: "request_submitted",
    channel: "email",
    status: "queued",
    referenceType: "leave_request",
    referenceId: new mongoose.Types.ObjectId(REFERENCE_ID),
    platformMessageId: null,
    attempts: 0,
    lastError: null,
    sentAt: null,
    deliveredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as INotification;

  describe("notify", () => {
    it("creates an in-app notification record", async () => {
      const { service, repo } = makeService();
      const createMock = repo.create as MockedFunction<NotificationRepository["create"]>;
      createMock.mockResolvedValue(fakeNotification);

      await service.notify({
        tenantId: TENANT_A,
        recipientEmployeeId: EMPLOYEE_ID,
        eventType: "request_submitted",
        referenceType: "leave_request",
        referenceId: REFERENCE_ID,
      });

      expect(createMock).toHaveBeenCalledOnce();
      const arg = createMock.mock.calls[0]![0];
      expect(arg.tenantId).toBe(TENANT_A);
      expect(arg.eventType).toBe("request_submitted");
    });

    it("enqueues slack_dm job when employee has Slack connection", async () => {
      const { service, repo, notificationQueue } = makeService({
        botChecker: makeBotChecker(["slack"]),
      });
      (repo.create as MockedFunction<NotificationRepository["create"]>).mockResolvedValue(
        fakeNotification
      );

      await service.notify({
        tenantId: TENANT_A,
        recipientEmployeeId: EMPLOYEE_ID,
        eventType: "approval_pending",
        referenceType: "leave_request",
        referenceId: REFERENCE_ID,
      });

      const addMock = notificationQueue.add as MockedFunction<Queue["add"]>;
      expect(addMock).toHaveBeenCalledOnce();
      const jobData = addMock.mock.calls[0]![1] as NotificationJobData;
      expect(jobData.channel).toBe("slack_dm");
    });

    it("enqueues teams_dm job when employee has Teams connection", async () => {
      const { service, repo, notificationQueue } = makeService({
        botChecker: makeBotChecker(["teams"]),
      });
      (repo.create as MockedFunction<NotificationRepository["create"]>).mockResolvedValue(
        fakeNotification
      );

      await service.notify({
        tenantId: TENANT_A,
        recipientEmployeeId: EMPLOYEE_ID,
        eventType: "request_approved_final",
        referenceType: "leave_request",
        referenceId: REFERENCE_ID,
      });

      const addMock = notificationQueue.add as MockedFunction<Queue["add"]>;
      expect(addMock).toHaveBeenCalledOnce();
      const jobData = addMock.mock.calls[0]![1] as NotificationJobData;
      expect(jobData.channel).toBe("teams_dm");
    });

    it("falls back to email when employee has no platform connection", async () => {
      const { service, repo, notificationQueue } = makeService({
        botChecker: makeBotChecker([]),
      });
      (repo.create as MockedFunction<NotificationRepository["create"]>).mockResolvedValue(
        fakeNotification
      );

      await service.notify({
        tenantId: TENANT_A,
        recipientEmployeeId: EMPLOYEE_ID,
        eventType: "request_rejected",
        referenceType: "leave_request",
        referenceId: REFERENCE_ID,
      });

      const addMock = notificationQueue.add as MockedFunction<Queue["add"]>;
      expect(addMock).toHaveBeenCalledOnce();
      const jobData = addMock.mock.calls[0]![1] as NotificationJobData;
      expect(jobData.channel).toBe("email");
    });

    it("enqueues jobs for both platforms when employee has both connections", async () => {
      const { service, repo, notificationQueue } = makeService({
        botChecker: makeBotChecker(["slack", "teams"]),
      });
      (repo.create as MockedFunction<NotificationRepository["create"]>).mockResolvedValue(
        fakeNotification
      );

      await service.notify({
        tenantId: TENANT_A,
        recipientEmployeeId: EMPLOYEE_ID,
        eventType: "request_submitted",
        referenceType: "leave_request",
        referenceId: REFERENCE_ID,
      });

      const addMock = notificationQueue.add as MockedFunction<Queue["add"]>;
      expect(addMock).toHaveBeenCalledTimes(2);

      const channels = addMock.mock.calls.map(
        (c) => (c[1] as NotificationJobData).channel
      );
      expect(channels).toContain("slack_dm");
      expect(channels).toContain("teams_dm");
    });

    it("returns the created notification record", async () => {
      const { service, repo } = makeService();
      (repo.create as MockedFunction<NotificationRepository["create"]>).mockResolvedValue(
        fakeNotification
      );

      const result = await service.notify({
        tenantId: TENANT_A,
        recipientEmployeeId: EMPLOYEE_ID,
        eventType: "request_submitted",
        referenceType: "leave_request",
        referenceId: REFERENCE_ID,
      });

      expect(result).toBe(fakeNotification);
    });
  });

  describe("getInbox", () => {
    it("delegates to repo.findByEmployee", async () => {
      const { service, repo } = makeService();
      const findMock = repo.findByEmployee as MockedFunction<
        NotificationRepository["findByEmployee"]
      >;
      const fakeResult: PaginatedResult<INotification> = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      };
      findMock.mockResolvedValue(fakeResult);

      const result = await service.getInbox(TENANT_A, EMPLOYEE_ID, {
        page: 1,
        limit: 10,
      });

      expect(findMock).toHaveBeenCalledWith(TENANT_A, EMPLOYEE_ID, { page: 1, limit: 10 }, {});
      expect(result).toBe(fakeResult);
    });
  });

  describe("markRead", () => {
    it("delegates to repo.markRead", async () => {
      const { service, repo } = makeService();
      const markMock = repo.markRead as MockedFunction<NotificationRepository["markRead"]>;
      markMock.mockResolvedValue(fakeNotification);

      const result = await service.markRead(TENANT_A, EMPLOYEE_ID, "notif-123");

      expect(markMock).toHaveBeenCalledWith(TENANT_A, "notif-123");
      expect(result).toBe(fakeNotification);
    });
  });

  describe("markAllRead", () => {
    it("delegates to repo.markAllRead", async () => {
      const { service, repo } = makeService();
      const markAllMock = repo.markAllRead as MockedFunction<
        NotificationRepository["markAllRead"]
      >;
      markAllMock.mockResolvedValue(7);

      const count = await service.markAllRead(TENANT_A, EMPLOYEE_ID);

      expect(markAllMock).toHaveBeenCalledWith(TENANT_A, EMPLOYEE_ID);
      expect(count).toBe(7);
    });
  });

  describe("getUnreadCount", () => {
    it("delegates to repo.countUnread", async () => {
      const { service, repo } = makeService();
      const countMock = repo.countUnread as MockedFunction<
        NotificationRepository["countUnread"]
      >;
      countMock.mockResolvedValue(3);

      const count = await service.getUnreadCount(TENANT_A, EMPLOYEE_ID);

      expect(countMock).toHaveBeenCalledWith(TENANT_A, EMPLOYEE_ID);
      expect(count).toBe(3);
    });
  });
});
