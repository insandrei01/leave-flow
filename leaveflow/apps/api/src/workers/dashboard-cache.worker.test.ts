/**
 * Dashboard cache worker tests.
 *
 * Tests pre-computation logic and Redis cache interactions.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  processDashboardCacheJob,
  CACHE_KEY_PREFIX,
  CACHE_TTL_SECONDS,
  type DashboardCacheWorkerDeps,
} from "./dashboard-cache.worker.js";
import type { DashboardCacheJobData } from "../lib/bullmq.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeSummary() {
  return {
    generatedAt: new Date(),
    widgets: {
      outToday: { count: 0, employees: [], cacheTtlSeconds: 60 },
      pendingApprovals: { count: 0, staleCount: 0, oldestPendingHours: 0, cacheTtlSeconds: 30 },
      utilizationRate: { averageUtilizationPercent: 42, trend: "flat", trendPercent: 0, cacheTtlSeconds: 3600 },
      upcomingWeek: { days: [], cacheTtlSeconds: 300 },
      absenceHeatmap: { year: 2025, month: 3, days: [], cacheTtlSeconds: 300 },
      resolutionRate: { periodLabel: "March 2025", approved: 0, pending: 0, rejected: 0, total: 0, approvalRatePercent: 0, cacheTtlSeconds: 300 },
      activityFeed: { events: [], cacheTtlSeconds: 30 },
      needsAttention: { requests: [], cacheTtlSeconds: 30 },
      teamBalances: { teams: [], cacheTtlSeconds: 3600 },
    },
  };
}

function makeDeps(overrides: Partial<DashboardCacheWorkerDeps> = {}): DashboardCacheWorkerDeps {
  return {
    dashboardService: {
      getSummary: vi.fn().mockResolvedValue(makeSummary()),
    },
    redisClient: {
      set: vi.fn().mockResolvedValue("OK"),
      get: vi.fn().mockResolvedValue(null),
      del: vi.fn().mockResolvedValue(1),
    },
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("processDashboardCacheJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls dashboardService.getSummary with tenantId", async () => {
    const deps = makeDeps();
    const jobData: DashboardCacheJobData = {
      tenantId: "tenant-xyz",
      widgets: ["utilizationRate", "teamBalances"],
    };

    await processDashboardCacheJob(jobData, deps);

    expect(deps.dashboardService.getSummary).toHaveBeenCalledWith("tenant-xyz");
  });

  it("stores result in Redis with correct cache key", async () => {
    const deps = makeDeps();
    const jobData: DashboardCacheJobData = {
      tenantId: "tenant-abc",
      widgets: ["utilizationRate"],
    };

    await processDashboardCacheJob(jobData, deps);

    expect(deps.redisClient.set).toHaveBeenCalledWith(
      `${CACHE_KEY_PREFIX}:tenant-abc`,
      expect.any(String),
      "EX",
      CACHE_TTL_SECONDS
    );
  });

  it("stores JSON-serialized dashboard summary", async () => {
    const summary = makeSummary();
    const deps = makeDeps({
      dashboardService: {
        getSummary: vi.fn().mockResolvedValue(summary),
      },
    });
    const jobData: DashboardCacheJobData = {
      tenantId: "tenant-abc",
      widgets: [],
    };

    await processDashboardCacheJob(jobData, deps);

    const setCall = (deps.redisClient.set as ReturnType<typeof vi.fn>).mock.calls[0];
    const stored = JSON.parse(setCall[1] as string);
    expect(stored.widgets.utilizationRate.averageUtilizationPercent).toBe(42);
  });

  it("handles dashboard service error gracefully", async () => {
    const deps = makeDeps({
      dashboardService: {
        getSummary: vi.fn().mockRejectedValue(new Error("DB connection error")),
      },
    });
    const jobData: DashboardCacheJobData = {
      tenantId: "tenant-abc",
      widgets: [],
    };

    await expect(processDashboardCacheJob(jobData, deps)).rejects.toThrow("DB connection error");

    // Should not cache anything on error
    expect(deps.redisClient.set).not.toHaveBeenCalled();
  });
});

describe("CACHE_KEY_PREFIX", () => {
  it("is a non-empty string", () => {
    expect(typeof CACHE_KEY_PREFIX).toBe("string");
    expect(CACHE_KEY_PREFIX.length).toBeGreaterThan(0);
  });
});

describe("CACHE_TTL_SECONDS", () => {
  it("is 5 minutes (300 seconds)", () => {
    expect(CACHE_TTL_SECONDS).toBe(300);
  });
});
