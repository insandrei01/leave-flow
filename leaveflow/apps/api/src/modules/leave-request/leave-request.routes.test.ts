/**
 * Route-level tests for leave-request routes.
 * Services are mocked — no DB or workflow engine needed.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { createLeaveRequestRoutes } from "./leave-request.routes.js";
import type { LeaveRequestService } from "./leave-request.service.js";
import type { ValidationResult, PaginatedResult } from "./leave-request.types.js";
import type { ILeaveRequest } from "../../models/index.js";

const VALID_MONGO_ID = "507f1f77bcf86cd799439011";
const VALID_MONGO_ID_2 = "507f1f77bcf86cd799439012";

function buildLeaveRequest(
  overrides: Partial<ILeaveRequest> = {}
): ILeaveRequest {
  return {
    _id: new mongoose.Types.ObjectId(VALID_MONGO_ID),
    tenantId: "tenant-001",
    employeeId: new mongoose.Types.ObjectId(VALID_MONGO_ID_2),
    leaveTypeId: new mongoose.Types.ObjectId(VALID_MONGO_ID),
    startDate: new Date("2025-02-01"),
    endDate: new Date("2025-02-05"),
    halfDayStart: false,
    halfDayEnd: false,
    workingDays: 5,
    reason: null,
    status: "pending_approval",
    currentStep: 0,
    currentApproverEmployeeId: null,
    currentStepStartedAt: new Date(),
    workflowSnapshot: {
      workflowId: new mongoose.Types.ObjectId(VALID_MONGO_ID),
      workflowVersion: 1,
      name: "Standard",
      steps: [],
    },
    approvalHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ILeaveRequest;
}

const validationResult: ValidationResult = {
  valid: true,
  workingDays: 5,
  errors: [],
};

const paginatedResult: PaginatedResult<ILeaveRequest> = {
  items: [buildLeaveRequest()],
  total: 1,
  page: 1,
  limit: 20,
};

function buildMockService(
  overrides: Partial<LeaveRequestService> = {}
): LeaveRequestService {
  return {
    create: vi.fn().mockResolvedValue(buildLeaveRequest()),
    validate: vi.fn().mockResolvedValue(validationResult),
    cancel: vi.fn().mockResolvedValue(undefined),
    findById: vi.fn().mockResolvedValue(buildLeaveRequest()),
    findAll: vi.fn().mockResolvedValue(paginatedResult),
    findForCalendar: vi.fn().mockResolvedValue([buildLeaveRequest()]),
    ...overrides,
  } as unknown as LeaveRequestService;
}

async function buildApp(
  service: LeaveRequestService,
  role = "employee",
  employeeId = VALID_MONGO_ID_2
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    request.auth = {
      uid: "uid",
      tenantId: "tenant-001",
      employeeId,
      role,
    };
  });
  await app.register(createLeaveRequestRoutes(service));
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// GET /leave-requests
// ----------------------------------------------------------------

describe("GET /leave-requests", () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await buildApp(buildMockService()); });
  afterAll(async () => { await app.close(); });

  it("returns 200 with paginated list", async () => {
    const res = await app.inject({ method: "GET", url: "/leave-requests" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; meta: unknown };
    expect(body.success).toBe(true);
    expect(body.meta).toBeDefined();
  });

  it("accepts status filter", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/leave-requests?status=pending_approval",
    });
    expect(res.statusCode).toBe(200);
  });

  it("returns 422 for invalid status", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/leave-requests?status=bad_status",
    });
    expect(res.statusCode).toBe(422);
  });
});

// ----------------------------------------------------------------
// POST /leave-requests
// ----------------------------------------------------------------

describe("POST /leave-requests", () => {
  const validBody = {
    leaveTypeId: VALID_MONGO_ID,
    startDate: "2025-03-01",
    endDate: "2025-03-05",
    halfDayStart: false,
    halfDayEnd: false,
    reason: null,
  };

  it("returns 201 for any authenticated user", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({ method: "POST", url: "/leave-requests", payload: validBody });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 422 for missing leaveTypeId", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/leave-requests",
      payload: { startDate: "2025-03-01", endDate: "2025-03-05" },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 422 when end date is before start date", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/leave-requests",
      payload: {
        leaveTypeId: VALID_MONGO_ID,
        startDate: "2025-03-10",
        endDate: "2025-03-01",
      },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// GET /leave-requests/:id
// ----------------------------------------------------------------

describe("GET /leave-requests/:id", () => {
  it("returns 200", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: `/leave-requests/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 404 when not found", async () => {
    const service = buildMockService({ findById: vi.fn().mockResolvedValue(null) });
    const app = await buildApp(service);
    const res = await app.inject({ method: "GET", url: `/leave-requests/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it("returns 422 for invalid ID", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: "/leave-requests/bad-id" });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /leave-requests/:id/cancel
// ----------------------------------------------------------------

describe("POST /leave-requests/:id/cancel", () => {
  it("returns 200 when owner cancels", async () => {
    // employeeId matches the leave request's employeeId
    const app = await buildApp(buildMockService(), "employee", VALID_MONGO_ID_2);
    const res = await app.inject({
      method: "POST",
      url: `/leave-requests/${VALID_MONGO_ID}/cancel`,
      payload: { reason: "Plans changed" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 200 when hr_admin cancels", async () => {
    // HR admin with a different employeeId than the leave request owner
    const service = buildMockService({
      findById: vi.fn().mockResolvedValue(buildLeaveRequest()),
    });
    const hrApp = await buildApp(service, "hr_admin", "00000000000000000000000f");
    const res = await hrApp.inject({
      method: "POST",
      url: `/leave-requests/${VALID_MONGO_ID}/cancel`,
      payload: {},
    });
    expect(res.statusCode).toBe(200);
    await hrApp.close();
  });

  it("returns 403 when non-owner employee tries to cancel", async () => {
    // Different employeeId from the request owner
    const app = await buildApp(buildMockService(), "employee", "00000000000000000000000f");
    const res = await app.inject({
      method: "POST",
      url: `/leave-requests/${VALID_MONGO_ID}/cancel`,
      payload: {},
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 404 when leave request does not exist", async () => {
    const service = buildMockService({ findById: vi.fn().mockResolvedValue(null) });
    const app = await buildApp(service, "employee", VALID_MONGO_ID_2);
    const res = await app.inject({
      method: "POST",
      url: `/leave-requests/${VALID_MONGO_ID}/cancel`,
      payload: {},
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /leave-requests/validate
// ----------------------------------------------------------------

describe("POST /leave-requests/validate", () => {
  const validBody = {
    leaveTypeId: VALID_MONGO_ID,
    startDate: "2025-03-01",
    endDate: "2025-03-05",
    halfDayStart: false,
    halfDayEnd: false,
  };

  it("returns 200 with validation result", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({
      method: "POST",
      url: "/leave-requests/validate",
      payload: validBody,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { valid: boolean; workingDays: number };
    };
    expect(body.data.valid).toBe(true);
    expect(body.data.workingDays).toBe(5);
    await app.close();
  });

  it("returns 422 for invalid dates", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/leave-requests/validate",
      payload: {
        leaveTypeId: VALID_MONGO_ID,
        startDate: "not-a-date",
        endDate: "2025-03-05",
      },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});
