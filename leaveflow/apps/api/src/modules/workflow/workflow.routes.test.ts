/**
 * Route-level tests for workflow routes.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { createWorkflowRoutes } from "./workflow.routes.js";
import type { WorkflowService } from "./workflow.service.js";
import type { WorkflowRecord, WorkflowSnapshot } from "./workflow.types.js";

const VALID_MONGO_ID = "507f1f77bcf86cd799439011";

const STEP = {
  order: 0,
  approverType: "role_direct_manager" as const,
  approverUserId: null,
  approverGroupIds: null,
  timeoutHours: 48,
  escalationAction: "remind" as const,
  maxReminders: 3,
  allowDelegation: true,
};

function buildRecord(overrides: Partial<WorkflowRecord> = {}): WorkflowRecord {
  return {
    id: VALID_MONGO_ID,
    tenantId: "tenant-001",
    name: "Standard Approval",
    description: null,
    steps: [STEP],
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

const SNAPSHOT: WorkflowSnapshot = {
  workflowId: VALID_MONGO_ID,
  workflowVersion: 1,
  name: "Standard Approval",
  steps: [STEP],
};

function buildMockService(
  overrides: Partial<WorkflowService> = {}
): WorkflowService {
  return {
    findAll: vi.fn().mockResolvedValue([buildRecord()]),
    findById: vi.fn().mockResolvedValue(buildRecord()),
    create: vi.fn().mockResolvedValue(buildRecord()),
    update: vi.fn().mockResolvedValue(buildRecord()),
    delete: vi.fn().mockResolvedValue(undefined),
    createFromTemplate: vi.fn().mockResolvedValue(buildRecord()),
    clone: vi.fn().mockResolvedValue(buildRecord()),
    createSnapshot: vi.fn().mockResolvedValue(SNAPSHOT),
    ...overrides,
  };
}

async function buildApp(
  service: WorkflowService,
  role = "hr_admin"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    request.auth = { uid: "uid", tenantId: "tenant-001", employeeId: "emp-1", role };
  });
  await app.register(createWorkflowRoutes(service));
  await app.ready();
  return app;
}

const VALID_CREATE_BODY = {
  name: "Simple Approval",
  steps: [
    {
      order: 0,
      approverType: "role_direct_manager",
      timeoutHours: 48,
    },
  ],
};

// ----------------------------------------------------------------
// GET /workflows
// ----------------------------------------------------------------

describe("GET /workflows", () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await buildApp(buildMockService()); });
  afterAll(async () => { await app.close(); });

  it("returns 200 with list", async () => {
    const res = await app.inject({ method: "GET", url: "/workflows" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ----------------------------------------------------------------
// GET /workflows/:id
// ----------------------------------------------------------------

describe("GET /workflows/:id", () => {
  it("returns 200", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: `/workflows/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 422 for invalid ID", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: "/workflows/bad-id" });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 404 when not found", async () => {
    const service = buildMockService({
      findById: vi.fn().mockRejectedValue(new Error(`Workflow not found: ${VALID_MONGO_ID}`)),
    });
    const app = await buildApp(service);
    const res = await app.inject({ method: "GET", url: `/workflows/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /workflows
// ----------------------------------------------------------------

describe("POST /workflows", () => {
  it("returns 201 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "POST", url: "/workflows", payload: VALID_CREATE_BODY });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({ method: "POST", url: "/workflows", payload: VALID_CREATE_BODY });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 for missing steps", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "POST", url: "/workflows", payload: { name: "No Steps" } });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// PATCH /workflows/:id
// ----------------------------------------------------------------

describe("PATCH /workflows/:id", () => {
  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "PATCH",
      url: `/workflows/${VALID_MONGO_ID}`,
      payload: VALID_CREATE_BODY,
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for manager", async () => {
    const app = await buildApp(buildMockService(), "manager");
    const res = await app.inject({
      method: "PATCH",
      url: `/workflows/${VALID_MONGO_ID}`,
      payload: VALID_CREATE_BODY,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// DELETE /workflows/:id
// ----------------------------------------------------------------

describe("DELETE /workflows/:id", () => {
  it("returns 204 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "DELETE", url: `/workflows/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(204);
    await app.close();
  });

  it("returns 409 when workflow is assigned to teams", async () => {
    const service = buildMockService({
      delete: vi.fn().mockRejectedValue(
        new Error('Cannot delete workflow "Standard Approval": it is assigned to one or more teams')
      ),
    });
    const app = await buildApp(service);
    const res = await app.inject({ method: "DELETE", url: `/workflows/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(409);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /workflows/from-template
// ----------------------------------------------------------------

describe("POST /workflows/from-template", () => {
  it("returns 201 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/workflows/from-template",
      payload: { templateType: "simple", name: "My Simple Workflow" },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 422 for invalid templateType", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/workflows/from-template",
      payload: { templateType: "unknown", name: "Test" },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /workflows/:id/clone
// ----------------------------------------------------------------

describe("POST /workflows/:id/clone", () => {
  it("returns 201 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: `/workflows/${VALID_MONGO_ID}/clone`,
      payload: { name: "Cloned Workflow" },
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 422 for missing name", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: `/workflows/${VALID_MONGO_ID}/clone`,
      payload: {},
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /workflows/:id/test
// ----------------------------------------------------------------

describe("POST /workflows/:id/test", () => {
  it("returns 200 with snapshot for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: `/workflows/${VALID_MONGO_ID}/test`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { snapshot: WorkflowSnapshot; result: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.result).toBe("simulation_ok");
    expect(body.data.snapshot).toBeDefined();
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({
      method: "POST",
      url: `/workflows/${VALID_MONGO_ID}/test`,
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});
