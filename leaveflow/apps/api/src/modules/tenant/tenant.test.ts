/**
 * Unit tests for the tenant service.
 *
 * Uses a mocked repository — no real database connection needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTenantService } from "./tenant.service.js";
import type { TenantRepository } from "./tenant.repository.js";
import type { TenantRecord, PlanLimits } from "./tenant.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildTenantRecord(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: "tenant-001",
    name: "Acme Corp",
    slug: "acme-corp",
    plan: "free",
    isActive: true,
    settings: {
      timezone: "UTC",
      fiscalYearStartMonth: 1,
      workWeek: [1, 2, 3, 4, 5],
      coverageMinimumPercent: 50,
      announcementChannelEnabled: true,
      locale: "en",
    },
    planLimits: {
      maxEmployees: 10,
      maxWorkflowSteps: 1,
      maxLeaveTypes: 4,
      maxPlatforms: 1,
    },
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<TenantRepository> = {}
): TenantRepository {
  return {
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildTenantRecord()),
    update: vi.fn().mockResolvedValue(buildTenantRecord()),
    ...overrides,
  };
}

// ----------------------------------------------------------------
// createTenant
// ----------------------------------------------------------------

describe("TenantService.createTenant", () => {
  it("creates a tenant with valid input", async () => {
    const tenant = buildTenantRecord({ name: "Test Co", slug: "test-co" });
    const repo = buildMockRepo({ create: vi.fn().mockResolvedValue(tenant) });
    const service = createTenantService({ repo });

    const result = await service.createTenant({
      name: "Test Co",
      slug: "test-co",
    });

    expect(result.name).toBe("Test Co");
    expect(result.slug).toBe("test-co");
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws when name is empty", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(service.createTenant({ name: "", slug: "valid" })).rejects.toThrow(
      /name is required/i
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws when slug is empty", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(
      service.createTenant({ name: "Valid", slug: "" })
    ).rejects.toThrow(/slug is required/i);
  });

  it("throws when slug is too short", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(
      service.createTenant({ name: "Valid", slug: "ab" })
    ).rejects.toThrow(/3 and 50/i);
  });

  it("throws when slug is too long", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(
      service.createTenant({ name: "Valid", slug: "a".repeat(51) })
    ).rejects.toThrow(/3 and 50/i);
  });

  it("throws when slug contains invalid characters", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(
      service.createTenant({ name: "Valid", slug: "My Company!" })
    ).rejects.toThrow(/lowercase/i);
  });

  it("throws when workWeek contains invalid day numbers", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(
      service.createTenant({ name: "Valid", slug: "valid", workWeek: [1, 2, 7] })
    ).rejects.toThrow(/Invalid work week day/i);
  });

  it("accepts a valid workWeek", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(
      service.createTenant({ name: "Valid", slug: "valid", workWeek: [0, 6] })
    ).resolves.toBeDefined();
  });
});

// ----------------------------------------------------------------
// updateSettings
// ----------------------------------------------------------------

describe("TenantService.updateSettings", () => {
  let repo: TenantRepository;

  beforeEach(() => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTenantRecord()),
      update: vi.fn().mockImplementation(async (_id, data) => {
        const base = buildTenantRecord();
        return {
          ...base,
          settings: { ...base.settings, ...data.settings },
        };
      }),
    });
  });

  it("updates timezone successfully", async () => {
    const service = createTenantService({ repo });

    const result = await service.updateSettings("tenant-001", {
      timezone: "America/New_York",
    });

    expect(repo.update).toHaveBeenCalledWith("tenant-001", {
      settings: { timezone: "America/New_York" },
    });
    expect(result).toBeDefined();
  });

  it("updates workWeek successfully", async () => {
    const service = createTenantService({ repo });

    await expect(
      service.updateSettings("tenant-001", { workWeek: [0, 1, 2, 3, 4] })
    ).resolves.toBeDefined();
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws when workWeek is empty array", async () => {
    const service = createTenantService({ repo });

    await expect(
      service.updateSettings("tenant-001", { workWeek: [] })
    ).rejects.toThrow(/non-empty/i);
  });

  it("throws when coverageThreshold is out of range", async () => {
    const service = createTenantService({ repo });

    await expect(
      service.updateSettings("tenant-001", { coverageThreshold: 101 })
    ).rejects.toThrow(/0 and 100/i);

    await expect(
      service.updateSettings("tenant-001", { coverageThreshold: -1 })
    ).rejects.toThrow(/0 and 100/i);
  });

  it("throws when fiscalYearStartMonth is out of range", async () => {
    const service = createTenantService({ repo });

    await expect(
      service.updateSettings("tenant-001", { fiscalYearStartMonth: 0 })
    ).rejects.toThrow(/1 and 12/i);

    await expect(
      service.updateSettings("tenant-001", { fiscalYearStartMonth: 13 })
    ).rejects.toThrow(/1 and 12/i);
  });

  it("throws when tenant is not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTenantService({ repo });

    await expect(
      service.updateSettings("nonexistent", { timezone: "UTC" })
    ).rejects.toThrow(/not found/i);
  });

  it("throws when tenantId is empty", async () => {
    const service = createTenantService({ repo });

    await expect(service.updateSettings("", {})).rejects.toThrow(
      /tenantId is required/i
    );
  });
});

// ----------------------------------------------------------------
// getPlanLimits
// ----------------------------------------------------------------

describe("TenantService.getPlanLimits", () => {
  it("returns correct limits for free plan", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTenantRecord({ plan: "free" })),
    });
    const service = createTenantService({ repo });

    const limits: PlanLimits = await service.getPlanLimits("tenant-001");

    expect(limits.maxEmployees).toBe(10);
    expect(limits.maxWorkflowSteps).toBe(1);
    expect(limits.maxLeaveTypes).toBe(4);
    expect(limits.maxPlatforms).toBe(1);
  });

  it("returns correct limits for business plan", async () => {
    const repo = buildMockRepo({
      findById: vi
        .fn()
        .mockResolvedValue(buildTenantRecord({ plan: "business" })),
    });
    const service = createTenantService({ repo });

    const limits = await service.getPlanLimits("tenant-001");

    expect(limits.maxEmployees).toBe(250);
    expect(limits.maxWorkflowSteps).toBe(5);
  });

  it("returns correct limits for enterprise plan", async () => {
    const repo = buildMockRepo({
      findById: vi
        .fn()
        .mockResolvedValue(buildTenantRecord({ plan: "enterprise" })),
    });
    const service = createTenantService({ repo });

    const limits = await service.getPlanLimits("tenant-001");

    expect(limits.maxEmployees).toBe(10000);
  });

  it("throws when tenant is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTenantService({ repo });

    await expect(service.getPlanLimits("missing")).rejects.toThrow(/not found/i);
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createTenantService({ repo });

    await expect(service.getPlanLimits("")).rejects.toThrow(
      /tenantId is required/i
    );
  });

  it("returns a new object (immutable — not a reference to stored limits)", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTenantRecord({ plan: "free" })),
    });
    const service = createTenantService({ repo });

    const limitsA = await service.getPlanLimits("tenant-001");
    const limitsB = await service.getPlanLimits("tenant-001");

    expect(limitsA).not.toBe(limitsB);
  });
});
