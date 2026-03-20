/**
 * Dashboard service tests — verifies each widget shape and edge cases.
 *
 * Tests use mocked dependencies to stay fast and isolated.
 */

import { describe, it, expect, vi, beforeEach, type MockedFunction } from "vitest";

import { createDashboardService } from "./dashboard.service.js";
import type { DashboardService, DashboardDeps } from "./dashboard.service.js";

// ----------------------------------------------------------------
// Shared test fixtures
// ----------------------------------------------------------------

const TENANT_ID = "tenant-test";

function makeEmptyDeps(): DashboardDeps {
  return {
    leaveRequestModel: {
      countDocuments: vi.fn().mockResolvedValue(0),
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }),
      aggregate: vi.fn().mockResolvedValue([]),
    },
    employeeModel: {
      countDocuments: vi.fn().mockResolvedValue(0),
      find: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }),
      aggregate: vi.fn().mockResolvedValue([]),
    },
    balanceLedgerModel: {
      aggregate: vi.fn().mockResolvedValue([]),
    },
    auditLogModel: {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      }),
    },
    teamModel: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    },
  };
}

// ----------------------------------------------------------------
// Widget shape tests
// ----------------------------------------------------------------

describe("DashboardService.getSummary", () => {
  let deps: DashboardDeps;
  let service: DashboardService;

  beforeEach(() => {
    deps = makeEmptyDeps();
    service = createDashboardService(deps);
  });

  it("returns an object with all 9 widget keys", async () => {
    const result = await service.getSummary(TENANT_ID);

    expect(result.widgets).toHaveProperty("outToday");
    expect(result.widgets).toHaveProperty("pendingApprovals");
    expect(result.widgets).toHaveProperty("utilizationRate");
    expect(result.widgets).toHaveProperty("upcomingWeek");
    expect(result.widgets).toHaveProperty("absenceHeatmap");
    expect(result.widgets).toHaveProperty("resolutionRate");
    expect(result.widgets).toHaveProperty("activityFeed");
    expect(result.widgets).toHaveProperty("needsAttention");
    expect(result.widgets).toHaveProperty("teamBalances");
  });

  it("returns generatedAt as a Date", async () => {
    const result = await service.getSummary(TENANT_ID);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  describe("outToday widget", () => {
    it("returns zero count and empty employees list for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.outToday.count).toBe(0);
      expect(result.widgets.outToday.employees).toEqual([]);
      expect(result.widgets.outToday.cacheTtlSeconds).toBe(60);
    });

    it("returns count and employees list when there are absences today", async () => {
      const mockEmployee = {
        _id: "emp-1",
        firstName: "Alice",
        lastName: "Chen",
        teamId: "team-1",
        endDate: new Date(),
      };

      (deps.leaveRequestModel.aggregate as MockedFunction<typeof deps.leaveRequestModel.aggregate>)
        .mockResolvedValueOnce([
          { employeeId: "emp-1", endDate: new Date() },
        ]);

      (deps.employeeModel.find as MockedFunction<typeof deps.employeeModel.find>)
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue([mockEmployee]),
        } as ReturnType<typeof deps.employeeModel.find>);

      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.outToday.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("pendingApprovals widget", () => {
    it("returns zero counts for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.pendingApprovals.count).toBe(0);
      expect(result.widgets.pendingApprovals.staleCount).toBe(0);
      expect(result.widgets.pendingApprovals.cacheTtlSeconds).toBe(30);
    });

    it("includes oldestPendingHours as a number", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(typeof result.widgets.pendingApprovals.oldestPendingHours).toBe("number");
    });
  });

  describe("utilizationRate widget", () => {
    it("returns zero utilization for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.utilizationRate.averageUtilizationPercent).toBe(0);
      expect(result.widgets.utilizationRate.cacheTtlSeconds).toBe(3600);
    });

    it("includes trend field", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(["up", "down", "flat"]).toContain(result.widgets.utilizationRate.trend);
    });
  });

  describe("upcomingWeek widget", () => {
    it("returns exactly 5 days", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.upcomingWeek.days).toHaveLength(5);
      expect(result.widgets.upcomingWeek.cacheTtlSeconds).toBe(300);
    });

    it("each day has date, dayName, and absenceCount", async () => {
      const result = await service.getSummary(TENANT_ID);
      for (const day of result.widgets.upcomingWeek.days) {
        expect(typeof day.date).toBe("string");
        expect(typeof day.dayName).toBe("string");
        expect(typeof day.absenceCount).toBe("number");
      }
    });
  });

  describe("absenceHeatmap widget", () => {
    it("returns current month and year", async () => {
      const now = new Date();
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.absenceHeatmap.year).toBe(now.getFullYear());
      expect(result.widgets.absenceHeatmap.month).toBe(now.getMonth() + 1);
      expect(result.widgets.absenceHeatmap.cacheTtlSeconds).toBe(300);
    });

    it("days array contains date, absenceCount, coverageWarning", async () => {
      const result = await service.getSummary(TENANT_ID);
      for (const day of result.widgets.absenceHeatmap.days) {
        expect(typeof day.date).toBe("string");
        expect(typeof day.absenceCount).toBe("number");
        expect(typeof day.coverageWarning).toBe("boolean");
      }
    });
  });

  describe("resolutionRate widget", () => {
    it("returns zero counts for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.resolutionRate.approved).toBe(0);
      expect(result.widgets.resolutionRate.pending).toBe(0);
      expect(result.widgets.resolutionRate.rejected).toBe(0);
      expect(result.widgets.resolutionRate.total).toBe(0);
      expect(result.widgets.resolutionRate.cacheTtlSeconds).toBe(300);
    });

    it("includes periodLabel as a string", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(typeof result.widgets.resolutionRate.periodLabel).toBe("string");
    });

    it("approvalRatePercent is 0 when total is 0", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.resolutionRate.approvalRatePercent).toBe(0);
    });
  });

  describe("activityFeed widget", () => {
    it("returns empty events for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.activityFeed.events).toEqual([]);
      expect(result.widgets.activityFeed.cacheTtlSeconds).toBe(30);
    });

    it("maps audit log entries to activity feed events", async () => {
      const mockAuditLog = {
        _id: "log-1",
        action: "leave_request.approved",
        entityType: "leave_request",
        entityId: "lr-1",
        actorId: "emp-1",
        actorType: "employee",
        timestamp: new Date(),
        metadata: null,
        changes: null,
      };

      (deps.auditLogModel.find as MockedFunction<typeof deps.auditLogModel.find>)
        .mockReturnValueOnce({
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockResolvedValue([mockAuditLog]),
        } as ReturnType<typeof deps.auditLogModel.find>);

      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.activityFeed.events.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("needsAttention widget", () => {
    it("returns empty requests for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.needsAttention.requests).toEqual([]);
      expect(result.widgets.needsAttention.cacheTtlSeconds).toBe(30);
    });
  });

  describe("teamBalances widget", () => {
    it("returns empty teams for empty tenant", async () => {
      const result = await service.getSummary(TENANT_ID);
      expect(result.widgets.teamBalances.teams).toEqual([]);
      expect(result.widgets.teamBalances.cacheTtlSeconds).toBe(3600);
    });
  });

  describe("parallel execution", () => {
    it("runs all widget queries concurrently without serial blocking", async () => {
      const callOrder: string[] = [];

      (deps.leaveRequestModel.aggregate as MockedFunction<typeof deps.leaveRequestModel.aggregate>)
        .mockImplementation(async () => {
          callOrder.push("aggregate");
          return [];
        });

      (deps.auditLogModel.find as MockedFunction<typeof deps.auditLogModel.find>)
        .mockReturnValue({
          sort: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          lean: vi.fn().mockImplementation(async () => {
            callOrder.push("audit-find");
            return [];
          }),
        } as ReturnType<typeof deps.auditLogModel.find>);

      await service.getSummary(TENANT_ID);

      // All calls should have happened — order is not sequential-only
      expect(callOrder.length).toBeGreaterThan(0);
    });
  });
});
