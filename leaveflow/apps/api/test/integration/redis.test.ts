/**
 * Integration tests for P0-T07: Redis connection and BullMQ queue definitions.
 *
 * These tests verify:
 * - Redis client connects successfully
 * - getRedisClient() returns a live connection
 * - All 6 BullMQ queues are exported with correct names
 * - Jobs can be added to queues (type safety verified)
 * - Graceful disconnect
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getRedisClient, disconnectRedis } from "../../src/lib/redis.js";
import {
  escalationQueue,
  accrualQueue,
  notificationQueue,
  calendarSyncQueue,
  csvImportQueue,
  dashboardCacheQueue,
  QUEUE_NAMES,
} from "../../src/lib/bullmq.js";

const REDIS_URL = process.env["REDIS_URL"] ?? "redis://localhost:6379";

beforeAll(async () => {
  // Ensure env var is set for the test
  process.env["REDIS_URL"] = REDIS_URL;
});

afterAll(async () => {
  // Close BullMQ queue connections
  await Promise.all([
    escalationQueue.close(),
    accrualQueue.close(),
    notificationQueue.close(),
    calendarSyncQueue.close(),
    csvImportQueue.close(),
    dashboardCacheQueue.close(),
  ]);
  await disconnectRedis();
});

// ============================================================
// Redis Connection
// ============================================================

describe("Redis connection", () => {
  it("getRedisClient() returns a connected client", async () => {
    const client = getRedisClient();
    // PING -> PONG
    const result = await client.ping();
    expect(result).toBe("PONG");
  });

  it("getRedisClient() returns the same singleton instance on repeated calls", () => {
    const a = getRedisClient();
    const b = getRedisClient();
    expect(a).toBe(b);
  });
});

// ============================================================
// Queue Names
// ============================================================

describe("QUEUE_NAMES constants", () => {
  it("exports all 6 queue name constants", () => {
    expect(QUEUE_NAMES.ESCALATION).toBe("escalation");
    expect(QUEUE_NAMES.ACCRUAL).toBe("accrual");
    expect(QUEUE_NAMES.NOTIFICATION).toBe("notification");
    expect(QUEUE_NAMES.CALENDAR_SYNC).toBe("calendar-sync");
    expect(QUEUE_NAMES.CSV_IMPORT).toBe("csv-import");
    expect(QUEUE_NAMES.DASHBOARD_CACHE).toBe("dashboard-cache");
  });
});

// ============================================================
// Queue Instances
// ============================================================

describe("BullMQ queue instances", () => {
  it("escalationQueue has correct name", () => {
    expect(escalationQueue.name).toBe(QUEUE_NAMES.ESCALATION);
  });

  it("accrualQueue has correct name", () => {
    expect(accrualQueue.name).toBe(QUEUE_NAMES.ACCRUAL);
  });

  it("notificationQueue has correct name", () => {
    expect(notificationQueue.name).toBe(QUEUE_NAMES.NOTIFICATION);
  });

  it("calendarSyncQueue has correct name", () => {
    expect(calendarSyncQueue.name).toBe(QUEUE_NAMES.CALENDAR_SYNC);
  });

  it("csvImportQueue has correct name", () => {
    expect(csvImportQueue.name).toBe(QUEUE_NAMES.CSV_IMPORT);
  });

  it("dashboardCacheQueue has correct name", () => {
    expect(dashboardCacheQueue.name).toBe(QUEUE_NAMES.DASHBOARD_CACHE);
  });

  it("can add a job to escalationQueue", async () => {
    const job = await escalationQueue.add("check-escalations", {
      tenantId: "tenant-123",
      leaveRequestId: "lr-456",
      stepIndex: 0,
    });
    expect(job.id).toBeDefined();
    // Cleanup
    await job.remove();
  });

  it("can add a job to accrualQueue", async () => {
    const job = await accrualQueue.add("run-accrual", {
      tenantId: "tenant-123",
      leaveTypeId: "lt-789",
      effectiveDate: "2026-03-01",
    });
    expect(job.id).toBeDefined();
    await job.remove();
  });

  it("can add a job to notificationQueue", async () => {
    const job = await notificationQueue.add("send-notification", {
      notificationId: "notif-111",
      tenantId: "tenant-123",
      recipientEmployeeId: "emp-222",
      channel: "slack_dm" as const,
      eventType: "request_submitted" as const,
      referenceId: "lr-333",
    });
    expect(job.id).toBeDefined();
    await job.remove();
  });

  it("can add a job to calendarSyncQueue", async () => {
    const job = await calendarSyncQueue.add("sync-calendar", {
      tenantId: "tenant-123",
      employeeId: "emp-222",
      leaveRequestId: "lr-333",
      service: "google_calendar" as const,
      action: "create" as const,
    });
    expect(job.id).toBeDefined();
    await job.remove();
  });

  it("can add a job to csvImportQueue", async () => {
    const job = await csvImportQueue.add("import-csv", {
      tenantId: "tenant-123",
      uploadedBy: "emp-admin",
      fileKey: "s3://bucket/employees.csv",
      totalRows: 150,
    });
    expect(job.id).toBeDefined();
    await job.remove();
  });

  it("can add a job to dashboardCacheQueue", async () => {
    const job = await dashboardCacheQueue.add("refresh-cache", {
      tenantId: "tenant-123",
      widgets: ["out_today", "pending_count"],
    });
    expect(job.id).toBeDefined();
    await job.remove();
  });
});
