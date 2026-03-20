/**
 * Unit tests for the blackout period service.
 */

import { describe, it, expect, vi } from "vitest";
import { createBlackoutService } from "./blackout.service.js";
import type { BlackoutRepository, BlackoutPeriodRecord } from "./blackout.service.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildBlackout(
  overrides: Partial<BlackoutPeriodRecord> = {}
): BlackoutPeriodRecord {
  return {
    id: "bp-001",
    tenantId: "tenant-001",
    name: "Year-end freeze",
    startDate: new Date("2026-12-20"),
    endDate: new Date("2026-12-31"),
    teamIds: null,
    leaveTypeIds: null,
    reason: "Year-end financial close",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<BlackoutRepository> = {}
): BlackoutRepository {
  return {
    create: vi.fn().mockResolvedValue(buildBlackout()),
    findAll: vi.fn().mockResolvedValue([buildBlackout()]),
    findById: vi.fn().mockResolvedValue(buildBlackout()),
    delete: vi.fn().mockResolvedValue(true),
    findConflicts: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";

// ----------------------------------------------------------------
// createBlackoutPeriod
// ----------------------------------------------------------------

describe("BlackoutService.createBlackoutPeriod", () => {
  it("creates a blackout period with valid input", async () => {
    const repo = buildMockRepo();
    const service = createBlackoutService({ repo });

    const result = await service.createBlackoutPeriod(TENANT_ID, {
      name: "Year-end freeze",
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-31"),
    });

    expect(result.name).toBe("Year-end freeze");
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws when name is empty", async () => {
    const repo = buildMockRepo();
    const service = createBlackoutService({ repo });

    await expect(
      service.createBlackoutPeriod(TENANT_ID, {
        name: "",
        startDate: new Date("2026-12-20"),
        endDate: new Date("2026-12-31"),
      })
    ).rejects.toThrow(/name is required/i);
  });

  it("throws when startDate is after endDate", async () => {
    const repo = buildMockRepo();
    const service = createBlackoutService({ repo });

    await expect(
      service.createBlackoutPeriod(TENANT_ID, {
        name: "Invalid period",
        startDate: new Date("2026-12-31"),
        endDate: new Date("2026-12-20"),
      })
    ).rejects.toThrow(/startDate must not be after endDate/i);
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createBlackoutService({ repo });

    await expect(
      service.createBlackoutPeriod("", {
        name: "Test",
        startDate: new Date("2026-12-20"),
        endDate: new Date("2026-12-31"),
      })
    ).rejects.toThrow(/tenantId is required/i);
  });

  it("trims whitespace from name", async () => {
    const repo = buildMockRepo({
      create: vi.fn().mockImplementation(async (_tid, input) =>
        buildBlackout({ name: input.name })
      ),
    });
    const service = createBlackoutService({ repo });

    await service.createBlackoutPeriod(TENANT_ID, {
      name: "  Freeze  ",
      startDate: new Date("2026-12-20"),
      endDate: new Date("2026-12-31"),
    });

    const call = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0];
    const input = call?.[1] as { name: string };
    expect(input.name).toBe("Freeze");
  });
});

// ----------------------------------------------------------------
// listBlackoutPeriods
// ----------------------------------------------------------------

describe("BlackoutService.listBlackoutPeriods", () => {
  it("returns all active blackout periods", async () => {
    const repo = buildMockRepo({
      findAll: vi.fn().mockResolvedValue([buildBlackout(), buildBlackout({ id: "bp-002" })]),
    });
    const service = createBlackoutService({ repo });

    const result = await service.listBlackoutPeriods(TENANT_ID);

    expect(result).toHaveLength(2);
    expect(repo.findAll).toHaveBeenCalledWith(TENANT_ID);
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createBlackoutService({ repo });

    await expect(service.listBlackoutPeriods("")).rejects.toThrow(
      /tenantId is required/i
    );
  });
});

// ----------------------------------------------------------------
// deleteBlackoutPeriod
// ----------------------------------------------------------------

describe("BlackoutService.deleteBlackoutPeriod", () => {
  it("deletes an existing blackout period", async () => {
    const repo = buildMockRepo({ delete: vi.fn().mockResolvedValue(true) });
    const service = createBlackoutService({ repo });

    await expect(
      service.deleteBlackoutPeriod(TENANT_ID, "bp-001")
    ).resolves.not.toThrow();

    expect(repo.delete).toHaveBeenCalledWith(TENANT_ID, "bp-001");
  });

  it("throws when blackout period is not found", async () => {
    const repo = buildMockRepo({ delete: vi.fn().mockResolvedValue(false) });
    const service = createBlackoutService({ repo });

    await expect(
      service.deleteBlackoutPeriod(TENANT_ID, "missing")
    ).rejects.toThrow(/not found/i);
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createBlackoutService({ repo });

    await expect(
      service.deleteBlackoutPeriod("", "bp-001")
    ).rejects.toThrow(/tenantId is required/i);
  });
});

// ----------------------------------------------------------------
// validateNoBlackout
// ----------------------------------------------------------------

describe("BlackoutService.validateNoBlackout", () => {
  it("returns empty array when no conflicts", async () => {
    const repo = buildMockRepo({ findConflicts: vi.fn().mockResolvedValue([]) });
    const service = createBlackoutService({ repo });

    const conflicts = await service.validateNoBlackout({
      tenantId: TENANT_ID,
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-06-05"),
    });

    expect(conflicts).toHaveLength(0);
  });

  it("returns conflict details when dates overlap a blackout", async () => {
    const bp = buildBlackout({ name: "Year-end freeze", reason: "Annual close" });
    const repo = buildMockRepo({
      findConflicts: vi.fn().mockResolvedValue([bp]),
    });
    const service = createBlackoutService({ repo });

    const conflicts = await service.validateNoBlackout({
      tenantId: TENANT_ID,
      startDate: new Date("2026-12-22"),
      endDate: new Date("2026-12-24"),
    });

    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.blackoutId).toBe("bp-001");
    expect(conflicts[0]?.name).toBe("Year-end freeze");
    expect(conflicts[0]?.reason).toBe("Annual close");
  });

  it("maps conflict fields correctly (no extra mutation)", async () => {
    const bp = buildBlackout();
    const repo = buildMockRepo({
      findConflicts: vi.fn().mockResolvedValue([bp]),
    });
    const service = createBlackoutService({ repo });

    const conflicts = await service.validateNoBlackout({
      tenantId: TENANT_ID,
      startDate: new Date("2026-12-22"),
      endDate: new Date("2026-12-24"),
    });

    // Should only contain the mapped fields
    expect(conflicts[0]).toMatchObject({
      blackoutId: bp.id,
      name: bp.name,
      startDate: bp.startDate,
      endDate: bp.endDate,
      reason: bp.reason,
    });
  });
});
