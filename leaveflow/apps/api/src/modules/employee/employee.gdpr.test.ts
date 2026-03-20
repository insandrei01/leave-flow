/**
 * Unit tests for GDPR operations.
 */

import { describe, it, expect, vi } from "vitest";
import { createGdprService } from "./employee.gdpr.js";
import type { GdprEmployeeRepository } from "./employee.gdpr.js";
import type { EmployeeRecord, PaginatedResult } from "./employee.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildEmployee(overrides: Partial<EmployeeRecord> = {}): EmployeeRecord {
  return {
    id: "emp-001",
    tenantId: "tenant-001",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    displayName: "Alice Smith",
    role: "employee",
    teamId: null,
    firebaseUid: "uid-123",
    startDate: new Date("2024-01-01"),
    primaryPlatform: "email",
    timezone: "UTC",
    profileImageUrl: null,
    invitationToken: null,
    invitationExpiresAt: null,
    invitationStatus: "accepted",
    status: "active",
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<GdprEmployeeRepository> = {}
): GdprEmployeeRepository {
  return {
    findAll: vi.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as PaginatedResult<EmployeeRecord>),
    findById: vi.fn().mockResolvedValue(buildEmployee()),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByFirebaseUid: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildEmployee()),
    update: vi.fn().mockResolvedValue(buildEmployee()),
    deactivate: vi.fn().mockResolvedValue(buildEmployee({ status: "inactive" })),
    pseudonymize: vi.fn().mockResolvedValue(
      buildEmployee({
        email: "[DELETED:emp-001]",
        firstName: "[DELETED]",
        lastName: "[DELETED:emp-001]",
        firebaseUid: null,
        status: "inactive",
      })
    ),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";
const EMPLOYEE_ID = "emp-001";

// ----------------------------------------------------------------
// exportEmployeeData
// ----------------------------------------------------------------

describe("GdprService.exportEmployeeData", () => {
  it("returns a data export for an existing employee", async () => {
    const repo = buildMockRepo();
    const service = createGdprService({ repo });

    const result = await service.exportEmployeeData(TENANT_ID, EMPLOYEE_ID);

    expect(result.exportedAt).toBeDefined();
    expect(new Date(result.exportedAt).getTime()).not.toBeNaN();
    expect(result.employee.id).toBe(EMPLOYEE_ID);
    expect(result.employee.email).toBe("alice@example.com");
  });

  it("throws when employee is not found", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = createGdprService({ repo });

    await expect(
      service.exportEmployeeData(TENANT_ID, "missing")
    ).rejects.toThrow(/not found/i);
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createGdprService({ repo });

    await expect(
      service.exportEmployeeData("", EMPLOYEE_ID)
    ).rejects.toThrow(/tenantId is required/i);
  });

  it("throws when employeeId is empty", async () => {
    const repo = buildMockRepo();
    const service = createGdprService({ repo });

    await expect(
      service.exportEmployeeData(TENANT_ID, "")
    ).rejects.toThrow(/employeeId is required/i);
  });

  it("returns a snapshot and does not mutate the original record", async () => {
    const original = buildEmployee();
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(original),
    });
    const service = createGdprService({ repo });

    const result = await service.exportEmployeeData(TENANT_ID, EMPLOYEE_ID);

    // Must be a copy, not the same reference
    expect(result.employee).not.toBe(original);
    expect(result.employee.email).toBe(original.email);
  });
});

// ----------------------------------------------------------------
// pseudonymizeEmployee
// ----------------------------------------------------------------

describe("GdprService.pseudonymizeEmployee", () => {
  it("pseudonymizes an existing employee", async () => {
    const repo = buildMockRepo();
    const service = createGdprService({ repo });

    const result = await service.pseudonymizeEmployee(TENANT_ID, EMPLOYEE_ID);

    expect(result.employeeId).toBe(EMPLOYEE_ID);
    expect(result.pseudonymizedAt).toBeDefined();
    expect(new Date(result.pseudonymizedAt).getTime()).not.toBeNaN();
    expect(repo.pseudonymize).toHaveBeenCalledWith(TENANT_ID, EMPLOYEE_ID);
  });

  it("throws when employee is not found (findById returns null)", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const service = createGdprService({ repo });

    await expect(
      service.pseudonymizeEmployee(TENANT_ID, "missing")
    ).rejects.toThrow(/not found/i);
  });

  it("throws when pseudonymize fails (returns null)", async () => {
    const repo = buildMockRepo({
      pseudonymize: vi.fn().mockResolvedValue(null),
    });
    const service = createGdprService({ repo });

    await expect(
      service.pseudonymizeEmployee(TENANT_ID, EMPLOYEE_ID)
    ).rejects.toThrow(/Failed to pseudonymize/i);
  });

  it("throws when tenantId is empty", async () => {
    const repo = buildMockRepo();
    const service = createGdprService({ repo });

    await expect(
      service.pseudonymizeEmployee("", EMPLOYEE_ID)
    ).rejects.toThrow(/tenantId is required/i);
  });

  it("throws when employeeId is empty", async () => {
    const repo = buildMockRepo();
    const service = createGdprService({ repo });

    await expect(
      service.pseudonymizeEmployee(TENANT_ID, "")
    ).rejects.toThrow(/employeeId is required/i);
  });
});
