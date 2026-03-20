/**
 * Unit tests for the leave-type service.
 *
 * Uses a mocked repository — no real database connection needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createLeaveTypeService } from "./leave-type.service.js";
import type { LeaveTypeRepository } from "./leave-type.repository.js";
import type { LeaveTypeRecord } from "./leave-type.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildLeaveTypeRecord(
  overrides: Partial<LeaveTypeRecord> = {}
): LeaveTypeRecord {
  return {
    id: "lt-001",
    tenantId: "tenant-001",
    name: "Annual Leave",
    slug: "annual-leave",
    color: "#818CF8",
    icon: "calendar",
    isPaid: true,
    requiresApproval: true,
    defaultEntitlementDays: 20,
    allowNegativeBalance: false,
    isUnlimited: false,
    isRetroactiveAllowed: false,
    isActive: true,
    sortOrder: 0,
    isDefault: false,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<LeaveTypeRepository> = {}
): LeaveTypeRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildLeaveTypeRecord()),
    update: vi.fn().mockResolvedValue(buildLeaveTypeRecord()),
    delete: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";

// ----------------------------------------------------------------
// findAll
// ----------------------------------------------------------------

describe("LeaveTypeService.findAll", () => {
  it("delegates to repository and returns results", async () => {
    const records = [buildLeaveTypeRecord(), buildLeaveTypeRecord({ id: "lt-002" })];
    const repo = buildMockRepo({ findAll: vi.fn().mockResolvedValue(records) });
    const service = createLeaveTypeService({ repo });

    const result = await service.findAll(TENANT_ID);

    expect(result).toHaveLength(2);
    expect(repo.findAll).toHaveBeenCalledWith(TENANT_ID);
  });
});

// ----------------------------------------------------------------
// findById
// ----------------------------------------------------------------

describe("LeaveTypeService.findById", () => {
  it("returns the leave type when found", async () => {
    const record = buildLeaveTypeRecord();
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(record) });
    const service = createLeaveTypeService({ repo });

    const result = await service.findById(TENANT_ID, "lt-001");

    expect(result.id).toBe("lt-001");
  });

  it("throws when leave type is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createLeaveTypeService({ repo });

    await expect(service.findById(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });
});

// ----------------------------------------------------------------
// create
// ----------------------------------------------------------------

describe("LeaveTypeService.create", () => {
  it("creates a leave type with valid input", async () => {
    const repo = buildMockRepo();
    const service = createLeaveTypeService({ repo });

    const result = await service.create(TENANT_ID, {
      name: "Study Leave",
      defaultEntitlementDays: 5,
      color: "#818CF8",
    });

    expect(result).toBeDefined();
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws when name is empty", async () => {
    const repo = buildMockRepo();
    const service = createLeaveTypeService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "", defaultEntitlementDays: 5 })
    ).rejects.toThrow(/name is required/i);

    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws when color format is invalid", async () => {
    const repo = buildMockRepo();
    const service = createLeaveTypeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Test",
        defaultEntitlementDays: 5,
        color: "red",
      })
    ).rejects.toThrow(/Invalid color format/i);
  });

  it("accepts a valid hex color", async () => {
    const repo = buildMockRepo();
    const service = createLeaveTypeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Test",
        defaultEntitlementDays: 5,
        color: "#FF5733",
      })
    ).resolves.toBeDefined();
  });

  it("throws when entitlement days is 0", async () => {
    const repo = buildMockRepo();
    const service = createLeaveTypeService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "Test", defaultEntitlementDays: 0 })
    ).rejects.toThrow(/greater than 0/i);
  });

  it("throws when entitlement days is negative", async () => {
    const repo = buildMockRepo();
    const service = createLeaveTypeService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "Test", defaultEntitlementDays: -1 })
    ).rejects.toThrow(/greater than 0/i);
  });

  it("throws when name is not unique within the tenant", async () => {
    const existing = buildLeaveTypeRecord({ name: "Annual Leave" });
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(existing),
    });
    const service = createLeaveTypeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Annual Leave",
        defaultEntitlementDays: 20,
      })
    ).rejects.toThrow(/already exists/i);
  });
});

// ----------------------------------------------------------------
// update
// ----------------------------------------------------------------

describe("LeaveTypeService.update", () => {
  let repo: LeaveTypeRepository;

  beforeEach(() => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildLeaveTypeRecord()),
      findByName: vi.fn().mockResolvedValue(null),
    });
  });

  it("updates a leave type with valid input", async () => {
    const service = createLeaveTypeService({ repo });

    const result = await service.update(TENANT_ID, "lt-001", {
      name: "Modified Leave",
    });

    expect(result).toBeDefined();
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws when leave type is not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createLeaveTypeService({ repo });

    await expect(service.update(TENANT_ID, "missing", {})).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when new name conflicts with an existing leave type", async () => {
    const different = buildLeaveTypeRecord({ id: "lt-002", name: "Sick Leave" });
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildLeaveTypeRecord()),
      findByName: vi.fn().mockResolvedValue(different),
    });
    const service = createLeaveTypeService({ repo });

    await expect(
      service.update(TENANT_ID, "lt-001", { name: "Sick Leave" })
    ).rejects.toThrow(/already exists/i);
  });

  it("allows updating to the same name (no conflict with self)", async () => {
    const sameRecord = buildLeaveTypeRecord({ name: "Annual Leave" });
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(sameRecord),
      findByName: vi.fn().mockResolvedValue(sameRecord),
    });
    const service = createLeaveTypeService({ repo });

    // Same name as the existing record: should be treated as no conflict
    // since we check if the found record is the same one
    // The service calls findByName only when name changes; same name won't trigger
    await expect(
      service.update(TENANT_ID, "lt-001", { name: "Annual Leave" })
    ).resolves.toBeDefined();
  });

  it("throws when color format is invalid", async () => {
    const service = createLeaveTypeService({ repo });

    await expect(
      service.update(TENANT_ID, "lt-001", { color: "blue" })
    ).rejects.toThrow(/Invalid color format/i);
  });

  it("throws when entitlement days is 0 on update", async () => {
    const service = createLeaveTypeService({ repo });

    await expect(
      service.update(TENANT_ID, "lt-001", { defaultEntitlementDays: 0 })
    ).rejects.toThrow(/greater than 0/i);
  });
});

// ----------------------------------------------------------------
// delete
// ----------------------------------------------------------------

describe("LeaveTypeService.delete", () => {
  it("deletes a leave type that exists", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildLeaveTypeRecord()),
      delete: vi.fn().mockResolvedValue(true),
    });
    const service = createLeaveTypeService({ repo });

    await expect(service.delete(TENANT_ID, "lt-001")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith(TENANT_ID, "lt-001");
  });

  it("throws when leave type is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createLeaveTypeService({ repo });

    await expect(service.delete(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// seedDefaults
// ----------------------------------------------------------------

describe("LeaveTypeService.seedDefaults", () => {
  it("creates 3 default leave types when none exist", async () => {
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (_tid, data) =>
        buildLeaveTypeRecord({ name: data.name as string })
      ),
    });
    const service = createLeaveTypeService({ repo });

    const result = await service.seedDefaults(TENANT_ID);

    expect(result).toHaveLength(3);
    expect(repo.create).toHaveBeenCalledTimes(3);
  });

  it("skips leave types that already exist", async () => {
    const annualLeave = buildLeaveTypeRecord({ name: "Annual Leave" });
    const repo = buildMockRepo({
      findByName: vi.fn().mockImplementation(async (_tid, name) => {
        return name === "Annual Leave" ? annualLeave : null;
      }),
      create: vi.fn().mockImplementation(async (_tid, data) =>
        buildLeaveTypeRecord({ name: data.name as string })
      ),
    });
    const service = createLeaveTypeService({ repo });

    const result = await service.seedDefaults(TENANT_ID);

    // Only Sick Leave and Personal Leave should be created
    expect(result).toHaveLength(2);
    expect(repo.create).toHaveBeenCalledTimes(2);
  });

  it("returns empty array when all defaults already exist", async () => {
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(buildLeaveTypeRecord()),
    });
    const service = createLeaveTypeService({ repo });

    const result = await service.seedDefaults(TENANT_ID);

    expect(result).toHaveLength(0);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
