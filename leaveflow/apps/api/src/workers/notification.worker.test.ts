/**
 * Notification dispatch worker tests.
 *
 * Tests delivery routing, status tracking, and retry behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  processNotificationJob,
  type NotificationWorkerDeps,
} from "./notification.worker.js";
import type { NotificationJobData } from "../lib/bullmq.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeObjectId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    recipientEmployeeId: makeObjectId(),
    eventType: "request_approved_final",
    channel: "slack_dm",
    status: "queued",
    referenceType: "leave_request",
    referenceId: makeObjectId(),
    attempts: 0,
    ...overrides,
  };
}

function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    firstName: "Alice",
    lastName: "Smith",
    primaryPlatform: "slack",
    ...overrides,
  };
}

function makeBotMapping(overrides: Record<string, unknown> = {}) {
  return {
    platformUserId: "U12345",
    platform: "slack" as const,
    conversationReference: null,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<NotificationWorkerDeps> = {}): NotificationWorkerDeps {
  return {
    notificationRepo: {
      findById: vi.fn().mockResolvedValue(makeNotification()),
      updateDeliveryStatus: vi.fn().mockResolvedValue(undefined),
    },
    employeeRepo: {
      findById: vi.fn().mockResolvedValue(makeEmployee()),
    },
    botMappingRepo: {
      findByEmployee: vi.fn().mockResolvedValue([makeBotMapping()]),
    },
    slackAdapter: {
      sendDirectMessage: vi.fn().mockResolvedValue({
        platform: "slack",
        channelId: "C001",
        messageId: "ts-001",
      }),
    },
    teamsAdapter: {
      sendDirectMessage: vi.fn().mockResolvedValue({
        platform: "teams",
        channelId: "teams-conv",
        messageId: "teams-msg-001",
      }),
    },
    emailSender: {
      send: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

function makeJobData(overrides: Partial<NotificationJobData> = {}): NotificationJobData {
  return {
    notificationId: makeObjectId().toString(),
    tenantId: "tenant-a",
    recipientEmployeeId: makeObjectId().toString(),
    channel: "slack_dm",
    eventType: "request_approved_final",
    referenceId: makeObjectId().toString(),
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("processNotificationJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when notification record is not found", async () => {
    const deps = makeDeps({
      notificationRepo: {
        findById: vi.fn().mockResolvedValue(null),
        updateDeliveryStatus: vi.fn(),
      },
    });

    await processNotificationJob(makeJobData(), deps);

    expect(deps.slackAdapter.sendDirectMessage).not.toHaveBeenCalled();
    expect(deps.notificationRepo.updateDeliveryStatus).not.toHaveBeenCalled();
  });

  it("routes slack_dm channel to Slack adapter", async () => {
    const deps = makeDeps();

    await processNotificationJob(makeJobData({ channel: "slack_dm" }), deps);

    expect(deps.slackAdapter.sendDirectMessage).toHaveBeenCalledOnce();
    expect(deps.teamsAdapter.sendDirectMessage).not.toHaveBeenCalled();
    expect(deps.emailSender.send).not.toHaveBeenCalled();
  });

  it("routes teams_dm channel to Teams adapter", async () => {
    const teamsMapping = makeBotMapping({ platform: "teams", platformUserId: "teams-user-1" });
    const notification = makeNotification({ channel: "teams_dm" });
    const deps = makeDeps({
      notificationRepo: {
        findById: vi.fn().mockResolvedValue(notification),
        updateDeliveryStatus: vi.fn().mockResolvedValue(undefined),
      },
      botMappingRepo: {
        findByEmployee: vi.fn().mockResolvedValue([teamsMapping]),
      },
    });

    await processNotificationJob(makeJobData({ channel: "teams_dm" }), deps);

    expect(deps.teamsAdapter.sendDirectMessage).toHaveBeenCalledOnce();
    expect(deps.slackAdapter.sendDirectMessage).not.toHaveBeenCalled();
  });

  it("routes email channel to email sender", async () => {
    const notification = makeNotification({ channel: "email" });
    const deps = makeDeps({
      notificationRepo: {
        findById: vi.fn().mockResolvedValue(notification),
        updateDeliveryStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    await processNotificationJob(makeJobData({ channel: "email" }), deps);

    expect(deps.emailSender.send).toHaveBeenCalledOnce();
    expect(deps.slackAdapter.sendDirectMessage).not.toHaveBeenCalled();
  });

  it("updates status to 'sent' after successful delivery", async () => {
    const deps = makeDeps();
    const jobData = makeJobData();

    await processNotificationJob(jobData, deps);

    expect(deps.notificationRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      jobData.notificationId,
      expect.objectContaining({ status: "sent" })
    );
  });

  it("stores platformMessageId after successful Slack delivery", async () => {
    const deps = makeDeps();
    const jobData = makeJobData({ channel: "slack_dm" });

    await processNotificationJob(jobData, deps);

    expect(deps.notificationRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      jobData.notificationId,
      expect.objectContaining({ platformMessageId: "ts-001" })
    );
  });

  it("updates status to 'failed' and records error on delivery failure", async () => {
    const deps = makeDeps({
      slackAdapter: {
        sendDirectMessage: vi.fn().mockRejectedValue(new Error("Slack API error")),
      },
    });
    const jobData = makeJobData({ channel: "slack_dm" });

    await expect(processNotificationJob(jobData, deps)).rejects.toThrow("Slack API error");

    expect(deps.notificationRepo.updateDeliveryStatus).toHaveBeenCalledWith(
      jobData.notificationId,
      expect.objectContaining({
        status: "failed",
        lastError: expect.stringContaining("Slack API error"),
      })
    );
  });

  it("does nothing when employee has no bot mapping for the channel", async () => {
    const deps = makeDeps({
      botMappingRepo: {
        findByEmployee: vi.fn().mockResolvedValue([]),
      },
    });
    const jobData = makeJobData({ channel: "slack_dm" });

    await processNotificationJob(jobData, deps);

    expect(deps.slackAdapter.sendDirectMessage).not.toHaveBeenCalled();
  });
});
