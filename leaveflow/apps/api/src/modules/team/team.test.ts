/**
 * Unit tests for the team service.
 *
 * Uses a mocked repository — no real database connection needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createTeamService } from "./team.service.js";
import type { TeamRepository } from "./team.repository.js";
import type { TeamRecord, TeamMemberRecord } from "./team.types.js";
import type {
  EmployeeExistenceChecker,
  WorkflowExistenceChecker,
} from "./team.service.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildTeamRecord(overrides: Partial<TeamRecord> = {}): TeamRecord {
  return {
    id: "team-001",
    tenantId: "tenant-001",
    name: "Engineering",
    managerId: null,
    workflowId: null,
    announcementChannelSlack: null,
    announcementChannelTeams: null,
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<TeamRepository> = {}
): TeamRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildTeamRecord()),
    update: vi.fn().mockResolvedValue(buildTeamRecord()),
    delete: vi.fn().mockResolvedValue(true),
    findMembers: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";

// ----------------------------------------------------------------
// findAll
// ----------------------------------------------------------------

describe("TeamService.findAll", () => {
  it("delegates to repository and returns results", async () => {
    const records = [buildTeamRecord(), buildTeamRecord({ id: "team-002" })];
    const repo = buildMockRepo({ findAll: vi.fn().mockResolvedValue(records) });
    const service = createTeamService({ repo });

    const result = await service.findAll(TENANT_ID);

    expect(result).toHaveLength(2);
    expect(repo.findAll).toHaveBeenCalledWith(TENANT_ID);
  });
});

// ----------------------------------------------------------------
// findById
// ----------------------------------------------------------------

describe("TeamService.findById", () => {
  it("returns the team when found", async () => {
    const record = buildTeamRecord();
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(record) });
    const service = createTeamService({ repo });

    const result = await service.findById(TENANT_ID, "team-001");

    expect(result.id).toBe("team-001");
  });

  it("throws when team is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTeamService({ repo });

    await expect(service.findById(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });
});

// ----------------------------------------------------------------
// create
// ----------------------------------------------------------------

describe("TeamService.create", () => {
  it("creates a team with valid input", async () => {
    const repo = buildMockRepo();
    const service = createTeamService({ repo });

    const result = await service.create(TENANT_ID, { name: "Design" });

    expect(result).toBeDefined();
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws when name is empty", async () => {
    const repo = buildMockRepo();
    const service = createTeamService({ repo });

    await expect(service.create(TENANT_ID, { name: "" })).rejects.toThrow(
      /name is required/i
    );
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("throws when name is not unique within the tenant", async () => {
    const existing = buildTeamRecord({ name: "Engineering" });
    const repo = buildMockRepo({
      findByName: vi.fn().mockResolvedValue(existing),
    });
    const service = createTeamService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "Engineering" })
    ).rejects.toThrow(/already exists/i);
  });

  it("validates managerId when employeeChecker provided — throws on inactive", async () => {
    const repo = buildMockRepo();
    const employeeChecker: EmployeeExistenceChecker = {
      isActiveEmployee: vi.fn().mockResolvedValue(false),
    };
    const service = createTeamService({ repo, employeeChecker });

    await expect(
      service.create(TENANT_ID, { name: "Design", managerId: "emp-999" })
    ).rejects.toThrow(/not active/i);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("validates managerId when employeeChecker provided — passes on active", async () => {
    const repo = buildMockRepo();
    const employeeChecker: EmployeeExistenceChecker = {
      isActiveEmployee: vi.fn().mockResolvedValue(true),
    };
    const service = createTeamService({ repo, employeeChecker });

    await expect(
      service.create(TENANT_ID, { name: "Design", managerId: "emp-001" })
    ).resolves.toBeDefined();
  });

  it("skips managerId check when no employeeChecker provided", async () => {
    const repo = buildMockRepo();
    const service = createTeamService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "Design", managerId: "emp-001" })
    ).resolves.toBeDefined();
  });

  it("validates workflowId when workflowChecker provided — throws on missing", async () => {
    const repo = buildMockRepo();
    const workflowChecker: WorkflowExistenceChecker = {
      workflowExists: vi.fn().mockResolvedValue(false),
    };
    const service = createTeamService({ repo, workflowChecker });

    await expect(
      service.create(TENANT_ID, { name: "Design", workflowId: "wf-999" })
    ).rejects.toThrow(/Workflow not found/i);
  });
});

// ----------------------------------------------------------------
// update
// ----------------------------------------------------------------

describe("TeamService.update", () => {
  let repo: TeamRepository;

  beforeEach(() => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTeamRecord()),
      findByName: vi.fn().mockResolvedValue(null),
    });
  });

  it("updates a team with valid input", async () => {
    const service = createTeamService({ repo });

    const result = await service.update(TENANT_ID, "team-001", {
      name: "Platform Engineering",
    });

    expect(result).toBeDefined();
    expect(repo.update).toHaveBeenCalled();
  });

  it("throws when team is not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTeamService({ repo });

    await expect(service.update(TENANT_ID, "missing", {})).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when new name conflicts with existing team", async () => {
    const different = buildTeamRecord({ id: "team-002", name: "Design" });
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTeamRecord()),
      findByName: vi.fn().mockResolvedValue(different),
    });
    const service = createTeamService({ repo });

    await expect(
      service.update(TENANT_ID, "team-001", { name: "Design" })
    ).rejects.toThrow(/already exists/i);
  });

  it("throws when name update is empty string", async () => {
    const service = createTeamService({ repo });

    await expect(
      service.update(TENANT_ID, "team-001", { name: "" })
    ).rejects.toThrow(/cannot be empty/i);
  });

  it("validates managerId on update", async () => {
    const employeeChecker: EmployeeExistenceChecker = {
      isActiveEmployee: vi.fn().mockResolvedValue(false),
    };
    const service = createTeamService({ repo, employeeChecker });

    await expect(
      service.update(TENANT_ID, "team-001", { managerId: "emp-999" })
    ).rejects.toThrow(/not active/i);
  });
});

// ----------------------------------------------------------------
// delete
// ----------------------------------------------------------------

describe("TeamService.delete", () => {
  it("deletes a team that exists", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTeamRecord()),
      delete: vi.fn().mockResolvedValue(true),
    });
    const service = createTeamService({ repo });

    await expect(service.delete(TENANT_ID, "team-001")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith(TENANT_ID, "team-001");
  });

  it("throws when team is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTeamService({ repo });

    await expect(service.delete(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// findMembers
// ----------------------------------------------------------------

describe("TeamService.findMembers", () => {
  it("returns members for an existing team", async () => {
    const members: TeamMemberRecord[] = [
      {
        id: "emp-001",
        tenantId: TENANT_ID,
        email: "alice@test.com",
        firstName: "Alice",
        lastName: "Smith",
        role: "employee",
        status: "active",
        teamId: "team-001",
      },
    ];
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildTeamRecord()),
      findMembers: vi.fn().mockResolvedValue(members),
    });
    const service = createTeamService({ repo });

    const result = await service.findMembers(TENANT_ID, "team-001");

    expect(result).toHaveLength(1);
    expect(result[0]?.email).toBe("alice@test.com");
  });

  it("throws when team is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createTeamService({ repo });

    await expect(service.findMembers(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });
});
