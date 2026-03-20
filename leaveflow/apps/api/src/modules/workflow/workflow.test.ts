/**
 * Unit tests for the workflow service.
 *
 * Uses a mocked repository — no real database connection needed.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkflowService } from "./workflow.service.js";
import type { WorkflowRepository } from "./workflow.repository.js";
import type {
  WorkflowRecord,
  WorkflowStepRecord,
} from "./workflow.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildStepRecord(
  overrides: Partial<WorkflowStepRecord> = {}
): WorkflowStepRecord {
  return {
    order: 0,
    approverType: "role_direct_manager",
    approverUserId: null,
    approverGroupIds: null,
    timeoutHours: 48,
    escalationAction: "remind",
    maxReminders: 3,
    allowDelegation: true,
    ...overrides,
  };
}

function buildWorkflowRecord(
  overrides: Partial<WorkflowRecord> = {}
): WorkflowRecord {
  return {
    id: "wf-001",
    tenantId: "tenant-001",
    name: "Standard Approval",
    description: null,
    steps: [buildStepRecord()],
    autoApprovalRules: [],
    isTemplate: false,
    templateSlug: null,
    version: 1,
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockRepo(
  overrides: Partial<WorkflowRepository> = {}
): WorkflowRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByName: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(buildWorkflowRecord()),
    update: vi.fn().mockResolvedValue(buildWorkflowRecord()),
    delete: vi.fn().mockResolvedValue(true),
    hasAssignedTeams: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";

const VALID_STEP = {
  order: 0,
  approverType: "role_direct_manager" as const,
  timeoutHours: 48,
  escalationAction: "remind" as const,
};

// ----------------------------------------------------------------
// findAll
// ----------------------------------------------------------------

describe("WorkflowService.findAll", () => {
  it("delegates to repository", async () => {
    const records = [buildWorkflowRecord()];
    const repo = buildMockRepo({ findAll: vi.fn().mockResolvedValue(records) });
    const service = createWorkflowService({ repo });

    const result = await service.findAll(TENANT_ID);

    expect(result).toHaveLength(1);
    expect(repo.findAll).toHaveBeenCalledWith(TENANT_ID);
  });
});

// ----------------------------------------------------------------
// findById
// ----------------------------------------------------------------

describe("WorkflowService.findById", () => {
  it("returns the workflow when found", async () => {
    const record = buildWorkflowRecord();
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(record) });
    const service = createWorkflowService({ repo });

    const result = await service.findById(TENANT_ID, "wf-001");

    expect(result.id).toBe("wf-001");
  });

  it("throws when workflow is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createWorkflowService({ repo });

    await expect(service.findById(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });
});

// ----------------------------------------------------------------
// create
// ----------------------------------------------------------------

describe("WorkflowService.create", () => {
  it("creates a workflow with valid input", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    const result = await service.create(TENANT_ID, {
      name: "My Workflow",
      steps: [VALID_STEP],
    });

    expect(result).toBeDefined();
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws when name is empty", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "", steps: [VALID_STEP] })
    ).rejects.toThrow(/name is required/i);
  });

  it("throws when approverType is invalid", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Test",
        steps: [
          {
            ...VALID_STEP,
            approverType: "boss" as never,
          },
        ],
      })
    ).rejects.toThrow(/Invalid approverType/i);
  });

  it("throws when timeoutHours is 0", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Test",
        steps: [{ ...VALID_STEP, timeoutHours: 0 }],
      })
    ).rejects.toThrow(/greater than 0/i);
  });

  it("throws when timeoutHours is negative", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Test",
        steps: [{ ...VALID_STEP, timeoutHours: -1 }],
      })
    ).rejects.toThrow(/greater than 0/i);
  });

  it("throws when escalationAction is invalid", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.create(TENANT_ID, {
        name: "Test",
        steps: [{ ...VALID_STEP, escalationAction: "delete" as never }],
      })
    ).rejects.toThrow(/Invalid escalationAction/i);
  });

  it("accepts empty steps array", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.create(TENANT_ID, { name: "Empty", steps: [] })
    ).resolves.toBeDefined();
  });
});

// ----------------------------------------------------------------
// update
// ----------------------------------------------------------------

describe("WorkflowService.update", () => {
  let repo: WorkflowRepository;

  beforeEach(() => {
    repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildWorkflowRecord({ version: 2 })),
      update: vi
        .fn()
        .mockResolvedValue(buildWorkflowRecord({ version: 3, name: "Updated" })),
    });
  });

  it("increments version on every update", async () => {
    const service = createWorkflowService({ repo });

    await service.update(TENANT_ID, "wf-001", { name: "Updated" });

    expect(repo.update).toHaveBeenCalledWith(
      TENANT_ID,
      "wf-001",
      expect.objectContaining({ version: 3 })
    );
  });

  it("throws when workflow is not found", async () => {
    repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createWorkflowService({ repo });

    await expect(service.update(TENANT_ID, "missing", {})).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when name is empty string on update", async () => {
    const service = createWorkflowService({ repo });

    await expect(
      service.update(TENANT_ID, "wf-001", { name: "" })
    ).rejects.toThrow(/cannot be empty/i);
  });

  it("validates steps on update", async () => {
    const service = createWorkflowService({ repo });

    await expect(
      service.update(TENANT_ID, "wf-001", {
        steps: [{ ...VALID_STEP, timeoutHours: 0 }],
      })
    ).rejects.toThrow(/greater than 0/i);
  });
});

// ----------------------------------------------------------------
// delete
// ----------------------------------------------------------------

describe("WorkflowService.delete", () => {
  it("deletes a workflow with no assigned teams", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildWorkflowRecord()),
      hasAssignedTeams: vi.fn().mockResolvedValue(false),
      delete: vi.fn().mockResolvedValue(true),
    });
    const service = createWorkflowService({ repo });

    await expect(service.delete(TENANT_ID, "wf-001")).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith(TENANT_ID, "wf-001");
  });

  it("throws when workflow is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createWorkflowService({ repo });

    await expect(service.delete(TENANT_ID, "missing")).rejects.toThrow(
      /not found/i
    );
  });

  it("throws when workflow is assigned to teams", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildWorkflowRecord()),
      hasAssignedTeams: vi.fn().mockResolvedValue(true),
    });
    const service = createWorkflowService({ repo });

    await expect(service.delete(TENANT_ID, "wf-001")).rejects.toThrow(
      /assigned to one or more teams/i
    );
    expect(repo.delete).not.toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// createFromTemplate
// ----------------------------------------------------------------

describe("WorkflowService.createFromTemplate", () => {
  it("creates a simple 1-step workflow", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await service.createFromTemplate(TENANT_ID, "simple", "My Simple Workflow");

    expect(repo.create).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({
        name: "My Simple Workflow",
        steps: expect.arrayContaining([
          expect.objectContaining({ approverType: "role_direct_manager" }),
        ]),
      })
    );
    const callArg = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | { steps?: unknown[] }
      | undefined;
    expect(callArg?.steps).toHaveLength(1);
  });

  it("creates a standard 2-step workflow", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await service.createFromTemplate(TENANT_ID, "standard", "Standard");

    const callArg = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | { steps?: unknown[] }
      | undefined;
    expect(callArg?.steps).toHaveLength(2);
  });

  it("creates an enterprise 3-step workflow", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await service.createFromTemplate(TENANT_ID, "enterprise", "Enterprise");

    const callArg = (repo.create as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | { steps?: unknown[] }
      | undefined;
    expect(callArg?.steps).toHaveLength(3);
  });

  it("throws when name is empty", async () => {
    const repo = buildMockRepo();
    const service = createWorkflowService({ repo });

    await expect(
      service.createFromTemplate(TENANT_ID, "simple", "")
    ).rejects.toThrow(/name is required/i);
  });
});

// ----------------------------------------------------------------
// clone
// ----------------------------------------------------------------

describe("WorkflowService.clone", () => {
  it("clones a workflow with a new name", async () => {
    const source = buildWorkflowRecord({ name: "Original" });
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(source),
    });
    const service = createWorkflowService({ repo });

    await service.clone(TENANT_ID, "wf-001", "Copy of Original");

    expect(repo.create).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ name: "Copy of Original" })
    );
  });

  it("throws when source workflow is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createWorkflowService({ repo });

    await expect(
      service.clone(TENANT_ID, "missing", "Clone")
    ).rejects.toThrow(/not found/i);
  });

  it("throws when new name is empty", async () => {
    const repo = buildMockRepo({
      findById: vi.fn().mockResolvedValue(buildWorkflowRecord()),
    });
    const service = createWorkflowService({ repo });

    await expect(service.clone(TENANT_ID, "wf-001", "")).rejects.toThrow(
      /name is required/i
    );
  });
});

// ----------------------------------------------------------------
// createSnapshot
// ----------------------------------------------------------------

describe("WorkflowService.createSnapshot", () => {
  it("returns a snapshot with workflow data", async () => {
    const wf = buildWorkflowRecord({ id: "wf-001", version: 3 });
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(wf) });
    const service = createWorkflowService({ repo });

    const snapshot = await service.createSnapshot(TENANT_ID, "wf-001");

    expect(snapshot.workflowId).toBe("wf-001");
    expect(snapshot.workflowVersion).toBe(3);
    expect(snapshot.name).toBe(wf.name);
    expect(snapshot.steps).toHaveLength(wf.steps.length);
  });

  it("throws when workflow is not found", async () => {
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(null) });
    const service = createWorkflowService({ repo });

    await expect(
      service.createSnapshot(TENANT_ID, "missing")
    ).rejects.toThrow(/not found/i);
  });

  it("returns a frozen snapshot (immutable)", async () => {
    const wf = buildWorkflowRecord();
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(wf) });
    const service = createWorkflowService({ repo });

    const snapshot = await service.createSnapshot(TENANT_ID, "wf-001");

    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("snapshot steps are frozen", async () => {
    const wf = buildWorkflowRecord();
    const repo = buildMockRepo({ findById: vi.fn().mockResolvedValue(wf) });
    const service = createWorkflowService({ repo });

    const snapshot = await service.createSnapshot(TENANT_ID, "wf-001");

    for (const step of snapshot.steps) {
      expect(Object.isFrozen(step)).toBe(true);
    }
  });
});
