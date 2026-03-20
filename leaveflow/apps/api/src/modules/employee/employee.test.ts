/**
 * Unit tests for the employee service.
 *
 * Uses a mocked repository — no real database connection needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEmployeeService } from "./employee.service.js";
import type { EmployeeRepository } from "./employee.repository.js";
import type { EmployeeRecord, PaginatedResult } from "./employee.types.js";
import type { TeamExistenceChecker } from "./employee.service.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildEmployeeRecord(
  overrides: Partial<EmployeeRecord> = {}
): EmployeeRecord {
  return {
    id: "emp-001",
    tenantId: "tenant-001",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    displayName: "Alice Smith",
    role: "employee",
    teamId: null,
    firebaseUid: null,
    startDate: new Date("2024-01-01"),
    primaryPlatform: "email",
    timezone: "UTC",
    profileImageUrl: null,
    invitationToken: null,
    invitationExpiresAt: null,
    invitationStatus: "pending",
    status: "active",
    deactivatedAt: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function buildPaginatedResult(
  data: EmployeeRecord[] = []
): PaginatedResult<EmployeeRecord> {
  return { data, total: data.length, page: 1, limit: 20 };
}

function buildMockRepo(
  overrides: Partial<EmployeeRepository> = {}
): EmployeeRepository {
  return {
    findAll: vi.fn().mockResolvedValue(buildPaginatedResult()),
    findById: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(null),
    findByFirebaseUid: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildEmployeeRecord()),
    update: vi.fn().mockResolvedValue(buildEmployeeRecord()),
    deactivate: vi.fn().mockResolvedValue(buildEmployeeRecord({ status: "inactive" })),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";

// ----------------------------------------------------------------
// findAll
// ----------------------------------------------------------------

describe("EmployeeService.findAll", () => {
  it("delegates to repository with filters and pagination", async () => {
    const records = [buildEmployeeRecord(), buildEmployeeRecord({ id: "emp-002" })];
    const paged = buildPaginatedResult(records);
    const repo = buildMockRepo({ findAll: vi.fn().mockResolvedValue(paged) });
    const service = createEmployeeService({ repo });

    const result = await service.findAll(TENANT_ID, { status: "active" }, { page: 1, limit: 10 });

    expect(result.data).toHaveLength(2);
    expect(repo.findAll).toHaveBeenCalledWith(
      TENANT_ID,
      { status: "active" },
      { page: 1, limit: 10 }
    );
  });
});

// ----------------------------------------------------------------
// findById
// ----------------------------------------------------------------

describe("EmployeeService.findById", () => {
  it("returns the employee when found", async () => {
    const record = buildEmployeeRecord();
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(record) });
    const service = createEmployeeService({ repo });

    const result = await service.findById(TENANT_ID, "emp-001");

    expect(result.id).toBe("emp-001");
  });

  it("throws when employee is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createEmployeeService({ repo });

    await expect(service.findById(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });
});

// ----------------------------------------------------------------
// create
// ----------------------------------------------------------------

describe("EmployeeService.create", () => {
  it("creates an employee with valid input", async () => {
    const repo = buildMockRepo();
    const service = createEmployeeService({ repo });

    const result = await service.create(TENANT_ID, {
      email: "bob@example.com",
      firstName: "Bob",
      lastName: "Jones",
      startDate: new Date("2024-06-01"),
    });

    expect(result).toBeDefined();
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws when email is empty", async () => {
    const repo = buildMockRepo();
    const service = createEmployeeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        email: "",
        firstName: "Bob",
        lastName: "Jones",
        startDate: new Date(),
      })
    ).rejects.toThrow(/email is required/i);
  });

  it("throws when email format is invalid", async () => {
    const repo = buildMockRepo();
    const service = createEmployeeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        email: "not-an-email",
        firstName: "Bob",
        lastName: "Jones",
        startDate: new Date(),
      })
    ).rejects.toThrow(/Invalid email format/i);
  });

  it("throws when email already exists within tenant", async () => {
    const existing = buildEmployeeRecord({ email: "alice@example.com" });
    const repo = buildMockRepo({
      findByEmail: vi.fn().mockResolvedValue(existing),
    });
    const service = createEmployeeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        email: "alice@example.com",
        firstName: "Alice2",
        lastName: "Smith2",
        startDate: new Date(),
      })
    ).rejects.toThrow(/already exists/i);
  });

  it("throws when role is invalid", async () => {
    const repo = buildMockRepo();
    const service = createEmployeeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
        startDate: new Date(),
        role: "super_admin" as never,
      })
    ).rejects.toThrow(/Invalid role/i);
  });

  it("throws when firstName is empty", async () => {
    const repo = buildMockRepo();
    const service = createEmployeeService({ repo });

    await expect(
      service.create(TENANT_ID, {
        email: "new@example.com",
        firstName: "",
        lastName: "User",
        startDate: new Date(),
      })
    ).rejects.toThrow(/First name is required/i);
  });

  it("validates teamId when teamChecker provided — throws on missing team", async () => {
    const repo = buildMockRepo();
    const teamChecker: TeamExistenceChecker = {
      teamExists: vi.fn().mockResolvedValue(false),
    };
    const service = createEmployeeService({ repo, teamChecker });

    await expect(
      service.create(TENANT_ID, {
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
        startDate: new Date(),
        teamId: "team-999",
      })
    ).rejects.toThrow(/Team not found/i);
  });
});

// ----------------------------------------------------------------
// update
// ----------------------------------------------------------------

describe("EmployeeService.update", () => {
  let repo: EmployeeRepository;

  beforeEach(() => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildEmployeeRecord()),
    });
  });

  it("updates an employee with valid input", async () => {
    const service = createEmployeeService({ repo });

    const result = await service.update(TENANT_ID, "emp-001", {
      firstName: "Alicia",
    });

    expect(result).toBeDefined();
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws when employee is not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createEmployeeService({ repo });

    await expect(service.update(TENANT_ID, "missing", {})).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when role is invalid on update", async () => {
    const service = createEmployeeService({ repo });

    await expect(
      service.update(TENANT_ID, "emp-001", { role: "janitor" as never })
    ).rejects.toThrow(/Invalid role/i);
  });
});

// ----------------------------------------------------------------
// deactivate
// ----------------------------------------------------------------

describe("EmployeeService.deactivate", () => {
  it("deactivates an active employee", async () => {
    const activeEmp = buildEmployeeRecord({ status: "active" });
    const inactiveEmp = buildEmployeeRecord({ status: "inactive" });
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(activeEmp),
      deactivate: vi.fn().mockResolvedValue(inactiveEmp),
    });
    const service = createEmployeeService({ repo });

    const result = await service.deactivate(TENANT_ID, "emp-001");

    expect(result.status).toBe("inactive");
    expect(repo.deactivate).toHaveBeenCalledWith(TENANT_ID, "emp-001");
  });

  it("throws when employee is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createEmployeeService({ repo });

    await expect(service.deactivate(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when employee is already inactive", async () => {
    const inactive = buildEmployeeRecord({ status: "inactive" });
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(inactive),
    });
    const service = createEmployeeService({ repo });

    await expect(service.deactivate(TENANT_ID, "emp-001")).rejects.toThrow(
      /already inactive/i
    );
  });
});

// ----------------------------------------------------------------
// invite
// ----------------------------------------------------------------

describe("EmployeeService.invite", () => {
  it("creates an employee with status 'invited'", async () => {
    const invitedEmp = buildEmployeeRecord({ status: "invited" });
    const repo = buildMockRepo({
      create: vi.fn().mockResolvedValue(invitedEmp),
    });
    const service = createEmployeeService({ repo });

    const result = await service.invite(TENANT_ID, {
      email: "newuser@example.com",
      firstName: "New",
      lastName: "User",
      startDate: new Date(),
    });

    expect(result.status).toBe("invited");
    const callArgs = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0];
    const inputArg = callArgs?.[1] as { status?: string };
    expect(inputArg?.status).toBe("invited");
  });

  it("enforces email uniqueness for invitations", async () => {
    const existing = buildEmployeeRecord({ email: "exists@example.com" });
    const repo = buildMockRepo({
      findByEmail: vi.fn().mockResolvedValue(existing),
    });
    const service = createEmployeeService({ repo });

    await expect(
      service.invite(TENANT_ID, {
        email: "exists@example.com",
        firstName: "Dup",
        lastName: "User",
        startDate: new Date(),
      })
    ).rejects.toThrow(/already exists/i);
  });
});

// ----------------------------------------------------------------
// importFromCsv
// ----------------------------------------------------------------

describe("EmployeeService.importFromCsv", () => {
  it("creates employees for all valid rows", async () => {
    const repo = buildMockRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (_tid, data) =>
        buildEmployeeRecord({ email: data.email as string })
      ),
    });
    const service = createEmployeeService({ repo });

    const result = await service.importFromCsv(TENANT_ID, [
      {
        email: "alice@example.com",
        firstName: "Alice",
        lastName: "Smith",
      },
      {
        email: "bob@example.com",
        firstName: "Bob",
        lastName: "Jones",
      },
    ]);

    expect(result.created).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it("records errors for rows with invalid email", async () => {
    const repo = buildMockRepo();
    const service = createEmployeeService({ repo });

    const result = await service.importFromCsv(TENANT_ID, [
      { email: "not-valid", firstName: "Bad", lastName: "Row" },
    ]);

    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/invalid/i);
  });

  it("records errors for rows with duplicate email", async () => {
    const existing = buildEmployeeRecord({ email: "dup@example.com" });
    const repo = buildMockRepo({
      findByEmail: vi.fn().mockResolvedValue(existing),
    });
    const service = createEmployeeService({ repo });

    const result = await service.importFromCsv(TENANT_ID, [
      { email: "dup@example.com", firstName: "Dup", lastName: "User" },
    ]);

    expect(result.created).toHaveLength(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/already exists/i);
  });

  it("processes valid rows and collects errors for invalid rows in mixed input", async () => {
    let callCount = 0;
    const repo = buildMockRepo({
      findByEmail: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(async (_tid, data) => {
        callCount++;
        return buildEmployeeRecord({ email: data.email as string });
      }),
    });
    const service = createEmployeeService({ repo });

    const result = await service.importFromCsv(TENANT_ID, [
      { email: "valid@example.com", firstName: "Valid", lastName: "User" },
      { email: "bad-email", firstName: "Bad", lastName: "Row" },
      { email: "valid2@example.com", firstName: "Valid2", lastName: "User2" },
    ]);

    expect(result.created).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
  });

  it("records errors for rows with invalid role", async () => {
    const repo = buildMockRepo({ findByEmail: vi.fn().mockResolvedValue(null) });
    const service = createEmployeeService({ repo });

    const result = await service.importFromCsv(TENANT_ID, [
      {
        email: "user@example.com",
        firstName: "User",
        lastName: "Test",
        role: "boss",
      },
    ]);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.reason).toMatch(/Invalid role/i);
  });
});
