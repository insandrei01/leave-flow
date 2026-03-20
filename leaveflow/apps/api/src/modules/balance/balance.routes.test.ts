/**
 * Route-level tests for balance routes.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import mongoose from "mongoose";
import { createBalanceRoutes } from "./balance.routes.js";
import type { BalanceService } from "./balance.service.js";
import type { BalanceRepository } from "./balance.repository.js";
import type { BalanceSummary, PaginatedResult } from "./balance.types.js";
import type { IBalanceLedger } from "../../models/index.js";

const VALID_MONGO_ID = "507f1f77bcf86cd799439011";
const VALID_MONGO_ID_2 = "507f1f77bcf86cd799439012";

function buildBalanceSummary(): BalanceSummary[] {
  return [
    { leaveTypeId: new mongoose.Types.ObjectId(VALID_MONGO_ID), balance: 15 },
  ];
}

function buildLedgerHistory(): PaginatedResult<IBalanceLedger> {
  return { items: [], total: 0, page: 1, limit: 20 };
}

function buildMockService(
  overrides: Partial<BalanceService> = {}
): BalanceService {
  return {
    allocateInitial: vi.fn().mockResolvedValue(undefined),
    deduct: vi.fn().mockResolvedValue(undefined),
    restore: vi.fn().mockResolvedValue(undefined),
    accrue: vi.fn().mockResolvedValue(undefined),
    adjustManual: vi.fn().mockResolvedValue(undefined),
    checkSufficientBalance: vi.fn().mockResolvedValue(true),
    getEmployeeBalances: vi.fn().mockResolvedValue(buildBalanceSummary()),
    ...overrides,
  } as unknown as BalanceService;
}

function buildMockRepo(overrides: Partial<BalanceRepository> = {}): BalanceRepository {
  return {
    insert: vi.fn().mockResolvedValue({}),
    getBalance: vi.fn().mockResolvedValue(10),
    getBalances: vi.fn().mockResolvedValue(buildBalanceSummary()),
    getHistory: vi.fn().mockResolvedValue(buildLedgerHistory()),
    getTeamBalances: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as BalanceRepository;
}

async function buildApp(
  service: BalanceService,
  repo: BalanceRepository,
  role = "hr_admin",
  employeeId = VALID_MONGO_ID
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    request.auth = { uid: "uid", tenantId: "tenant-001", employeeId, role };
  });
  await app.register(createBalanceRoutes({ service, repo }));
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// GET /balances/me
// ----------------------------------------------------------------

describe("GET /balances/me", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService(), buildMockRepo(), "employee");
  });

  afterAll(async () => { await app.close(); });

  it("returns 200 with balance list", async () => {
    const res = await app.inject({ method: "GET", url: "/balances/me" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ----------------------------------------------------------------
// GET /balances/employees/:employeeId
// ----------------------------------------------------------------

describe("GET /balances/employees/:employeeId", () => {
  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}`,
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "employee");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}`,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 for invalid employeeId", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo());
    const res = await app.inject({
      method: "GET",
      url: "/balances/employees/bad-id",
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// GET /balances/employees/:employeeId/leave-types/:leaveTypeId
// ----------------------------------------------------------------

describe("GET /balances/employees/:employeeId/leave-types/:leaveTypeId", () => {
  it("returns 200 with balance for hr_admin", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { employeeId: string; leaveTypeId: string; balance: number };
    };
    expect(body.data.balance).toBe(10);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "employee");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// GET /balances/employees/:employeeId/history
// ----------------------------------------------------------------

describe("GET /balances/employees/:employeeId/history", () => {
  it("returns 200 with paginated history when leaveTypeId provided", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}/history?leaveTypeId=${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { meta: { total: number } };
    expect(body.meta).toBeDefined();
    await app.close();
  });

  it("returns 422 when leaveTypeId is missing", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}/history`,
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "employee");
    const res = await app.inject({
      method: "GET",
      url: `/balances/employees/${VALID_MONGO_ID_2}/history?leaveTypeId=${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /balances/adjust
// ----------------------------------------------------------------

describe("POST /balances/adjust", () => {
  const validBody = {
    employeeId: VALID_MONGO_ID_2,
    leaveTypeId: VALID_MONGO_ID,
    amount: 5,
    reason: "Correction for carry-over",
    effectiveDate: "2025-01-15",
  };

  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: "/balances/adjust",
      payload: validBody,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      data: { adjusted: boolean; amount: number };
    };
    expect(body.data.adjusted).toBe(true);
    expect(body.data.amount).toBe(5);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "employee");
    const res = await app.inject({
      method: "POST",
      url: "/balances/adjust",
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 403 for manager", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "manager");
    const res = await app.inject({
      method: "POST",
      url: "/balances/adjust",
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 for zero amount", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: "/balances/adjust",
      payload: { ...validBody, amount: 0 },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 422 for missing reason", async () => {
    const app = await buildApp(buildMockService(), buildMockRepo(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: "/balances/adjust",
      payload: { ...validBody, reason: "" },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});
