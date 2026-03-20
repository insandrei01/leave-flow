/**
 * Approval routes tests.
 *
 * Tests cover:
 * - POST /approvals/:id/approve — happy path, invalid ID
 * - POST /approvals/:id/reject — happy path, missing reason, short reason
 * - POST /approvals/:id/force-approve — hr_admin succeeds, employee fails
 * - GET  /approvals/pending — paginated list
 * - GET  /approvals/pending/count — badge count
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import mongoose from "mongoose";
import type { FastifyInstance } from "fastify";
import { errorHandlerPlugin } from "../../plugins/error-handler.plugin.js";
import { approvalRoutes } from "./approval.routes.js";
import type { ApprovalEngineService } from "./approval-engine.service.js";
import type { LeaveRequestRepository } from "../leave-request/leave-request.repository.js";
import type { ILeaveRequest } from "../../models/leave-request.model.js";
import type { ApprovalResult } from "./approval-engine.types.js";

// ---------------------------------------------------------------------------
// Mock Mongoose models to avoid real DB connections in route tests
// ---------------------------------------------------------------------------

vi.mock("../../models/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../models/index.js")>();
  const mockSelect = vi.fn().mockReturnThis();
  const mockLean = vi.fn().mockResolvedValue(null); // employee not found → falls back to employeeId string
  return {
    ...actual,
    EmployeeModel: {
      findOne: vi.fn().mockReturnValue({ select: mockSelect, lean: mockLean }),
    },
    DelegationModel: {
      findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    },
  };
});

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const VALID_ID = new mongoose.Types.ObjectId().toHexString();
const EMP_ID = new mongoose.Types.ObjectId().toHexString();

function makeApprovalResult(partial: Partial<ApprovalResult> = {}): ApprovalResult {
  const id = new mongoose.Types.ObjectId();
  return {
    leaveRequestId: id,
    previousStatus: "pending_approval",
    newStatus: "approved",
    stepAdvanced: false,
    isTerminal: true,
    ...partial,
  };
}

function buildMockApprovalEngine(
  overrides: Partial<ApprovalEngineService> = {}
): ApprovalEngineService {
  return {
    processApproval: vi.fn().mockResolvedValue(makeApprovalResult()),
    processRejection: vi.fn().mockResolvedValue(makeApprovalResult({ newStatus: "rejected" })),
    processEscalation: vi.fn().mockResolvedValue(makeApprovalResult()),
    processCancellation: vi.fn().mockResolvedValue(makeApprovalResult({ newStatus: "cancelled" })),
    checkAutoApproval: vi.fn().mockReturnValue(false),
    ...overrides,
  } as unknown as ApprovalEngineService;
}

/**
 * Builds a leave request stub where currentApproverEmployeeId matches EMP_ID.
 * This satisfies the SEC-007 authorization check in approve/reject handlers.
 */
function makeLeaveRequestStub(
  overrides: Partial<ILeaveRequest> = {}
): ILeaveRequest {
  return {
    _id: new mongoose.Types.ObjectId(),
    tenantId: "tenant_abc",
    employeeId: new mongoose.Types.ObjectId(),
    leaveTypeId: new mongoose.Types.ObjectId(),
    startDate: new Date(),
    endDate: new Date(),
    halfDayStart: false,
    halfDayEnd: false,
    workingDays: 1,
    reason: null,
    status: "pending_approval",
    currentStep: 0,
    reminderCount: 0,
    currentApproverEmployeeId: new mongoose.Types.ObjectId(EMP_ID),
    currentStepStartedAt: new Date(),
    workflowSnapshot: {
      workflowId: new mongoose.Types.ObjectId(),
      workflowVersion: 1,
      name: "Test Workflow",
      steps: [],
    },
    autoApprovalRuleName: null,
    approvalHistory: [],
    cancellationReason: null,
    cancelledAt: null,
    cancelledBy: null,
    calendarEventIds: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ILeaveRequest;
}

function buildMockRepo(
  overrides: Partial<LeaveRequestRepository> = {}
): LeaveRequestRepository {
  const items: ILeaveRequest[] = [];
  return {
    findAll: vi.fn().mockResolvedValue({ items, total: 0, page: 1, limit: 20 }),
    findById: vi.fn().mockResolvedValue(makeLeaveRequestStub()),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findPending: vi.fn().mockResolvedValue([]),
    findByEmployee: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    findForCalendar: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as LeaveRequestRepository;
}

type RoleType = "company_admin" | "hr_admin" | "manager" | "employee";

async function buildApp(
  approvalEngine: ApprovalEngineService,
  repo: LeaveRequestRepository,
  role: RoleType = "manager"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(errorHandlerPlugin);

  app.addHook("onRequest", async (request) => {
    request.auth = {
      uid: "uid_abc",
      tenantId: "tenant_abc",
      employeeId: EMP_ID,
      role,
    };
    request.tenantId = "tenant_abc";
  });

  await app.register(approvalRoutes, { approvalEngine, leaveRequestRepo: repo });
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("POST /approvals/:id/approve", () => {
  let app: FastifyInstance;
  let approvalEngine: ApprovalEngineService;

  beforeAll(async () => {
    approvalEngine = buildMockApprovalEngine();
    app = await buildApp(approvalEngine, buildMockRepo());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with approval result", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/approve`,
      payload: { note: "Looks good" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { newStatus: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.newStatus).toBe("approved");
  });

  it("returns 200 with empty body (note is optional)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/approve`,
      payload: {},
    });

    expect(res.statusCode).toBe(200);
  });

  it("returns 422 for invalid ObjectId", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/approvals/not-an-id/approve",
      payload: {},
    });

    expect(res.statusCode).toBe(422);
  });
});

describe("POST /approvals/:id/reject", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockApprovalEngine(), buildMockRepo());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with rejection result", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/reject`,
      payload: { reason: "This is a sufficient reason for rejection." },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { newStatus: string };
    };
    expect(body.data.newStatus).toBe("rejected");
  });

  it("returns 422 when reason is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/reject`,
      payload: {},
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when reason has fewer than 10 non-whitespace chars (BR-022)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/reject`,
      payload: { reason: "short   " }, // only 5 non-whitespace
    });

    expect(res.statusCode).toBe(422);
  });
});

describe("POST /approvals/:id/force-approve", () => {
  const VALID_REASON = "Override approved by HR for compliance reasons";

  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockApprovalEngine(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/force-approve`,
      payload: { reason: VALID_REASON },
    });
    await app.close();

    expect(res.statusCode).toBe(200);
  });

  it("returns 403 for employee role", async () => {
    const app = await buildApp(buildMockApprovalEngine(), buildMockRepo(), "employee");
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/force-approve`,
      payload: { reason: VALID_REASON },
    });
    await app.close();

    expect(res.statusCode).toBe(403);
  });

  it("returns 422 when reason is empty", async () => {
    const app = await buildApp(buildMockApprovalEngine(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: `/approvals/${VALID_ID}/force-approve`,
      payload: { reason: "" },
    });
    await app.close();

    expect(res.statusCode).toBe(422);
  });
});

describe("GET /approvals/pending", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const repo = buildMockRepo({
      findAll: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    });
    app = await buildApp(buildMockApprovalEngine(), repo);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with paginated result", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/approvals/pending",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: unknown[];
      meta: { total: number; page: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta.total).toBe(0);
    expect(body.meta.page).toBe(1);
  });
});

describe("GET /approvals/pending/count", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    const repo = buildMockRepo({
      findAll: vi.fn().mockResolvedValue({ items: [], total: 5, page: 1, limit: 1 }),
    });
    app = await buildApp(buildMockApprovalEngine(), repo);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with count", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/approvals/pending/count",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { count: number };
    };
    expect(body.success).toBe(true);
    expect(body.data.count).toBe(5);
  });
});
