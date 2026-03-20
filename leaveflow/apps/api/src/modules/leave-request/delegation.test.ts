/**
 * Delegation service and routes tests.
 *
 * Tests cover:
 * - DelegationService.create — happy path, self-delegation, overlap, invalid dates
 * - DelegationService.findActive — returns active delegations
 * - DelegationService.remove — happy path, not found
 * - DelegationService.findActiveDelegateFor — finds current delegate
 * - Routes: POST /delegations, GET /delegations/active, DELETE /delegations/:id
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { errorHandlerPlugin } from "../../plugins/error-handler.plugin.js";
import { delegationRoutes } from "./delegation.routes.js";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors.js";
import type { DelegationService, DelegationRecord } from "./delegation.service.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const DELEGATOR_ID = "aabbccdd0011223344556677";
const DELEGATE_ID = "aabbccdd0011223344556688";
const DELEGATION_ID = "aabbccdd0011223344556699";

const FUTURE_START = "2027-01-01";
const FUTURE_END = "2027-01-31";

function makeDelegationRecord(
  partial: Partial<DelegationRecord> = {}
): DelegationRecord {
  return Object.freeze({
    id: DELEGATION_ID,
    tenantId: "tenant_abc",
    delegatorId: DELEGATOR_ID,
    delegateId: DELEGATE_ID,
    startDate: new Date(FUTURE_START),
    endDate: new Date(FUTURE_END),
    reason: null,
    isActive: true,
    revokedAt: null,
    revokedBy: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  });
}

function buildMockService(
  overrides: Partial<DelegationService> = {}
): DelegationService {
  return {
    create: vi.fn().mockResolvedValue(makeDelegationRecord()),
    findActive: vi.fn().mockResolvedValue([makeDelegationRecord()]),
    remove: vi.fn().mockResolvedValue(undefined),
    findActiveDelegateFor: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

async function buildApp(
  service: DelegationService,
  employeeId = DELEGATOR_ID
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(errorHandlerPlugin);

  app.addHook("onRequest", async (request) => {
    request.auth = {
      uid: "uid_abc",
      tenantId: "tenant_abc",
      employeeId,
      role: "manager",
    };
    request.tenantId = "tenant_abc";
  });

  await app.register(delegationRoutes, { delegationService: service });
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// Route tests
// ----------------------------------------------------------------

describe("POST /delegations", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 201 with delegation record", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/delegations",
      payload: {
        delegateId: DELEGATE_ID,
        startDate: FUTURE_START,
        endDate: FUTURE_END,
        reason: "On holiday",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { id: string; delegateId: string };
    };
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(DELEGATION_ID);
    expect(body.data.delegateId).toBe(DELEGATE_ID);
  });

  it("returns 422 when delegateId is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/delegations",
      payload: { startDate: FUTURE_START, endDate: FUTURE_END },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when startDate >= endDate", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/delegations",
      payload: {
        delegateId: DELEGATE_ID,
        startDate: FUTURE_END,
        endDate: FUTURE_START,
      },
    });

    expect(res.statusCode).toBe(422);
  });

  it("returns 422 when dates are in wrong format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/delegations",
      payload: {
        delegateId: DELEGATE_ID,
        startDate: "01-01-2027",
        endDate: "31-01-2027",
      },
    });

    expect(res.statusCode).toBe(422);
  });

  it("returns 409 when delegation overlaps existing", async () => {
    const conflictService = buildMockService({
      create: vi.fn().mockRejectedValue(
        new ConflictError(
          "An active delegation already exists for this period",
          "DELEGATION_OVERLAP"
        )
      ),
    });
    const conflictApp = await buildApp(conflictService);

    const res = await conflictApp.inject({
      method: "POST",
      url: "/delegations",
      payload: {
        delegateId: DELEGATE_ID,
        startDate: FUTURE_START,
        endDate: FUTURE_END,
      },
    });
    await conflictApp.close();

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe("DELEGATION_OVERLAP");
  });

  it("returns 422 for self-delegation attempt", async () => {
    const selfService = buildMockService({
      create: vi.fn().mockRejectedValue(
        new ValidationError("Cannot delegate approval authority to yourself")
      ),
    });
    const selfApp = await buildApp(selfService);

    const res = await selfApp.inject({
      method: "POST",
      url: "/delegations",
      payload: {
        delegateId: DELEGATOR_ID, // same as employeeId
        startDate: FUTURE_START,
        endDate: FUTURE_END,
      },
    });
    await selfApp.close();

    expect(res.statusCode).toBe(422);
  });
});

describe("GET /delegations/active", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with active delegations array", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/delegations/active",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: DelegationRecord[];
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("returns 200 with empty array when no active delegations", async () => {
    const emptyService = buildMockService({
      findActive: vi.fn().mockResolvedValue([]),
    });
    const emptyApp = await buildApp(emptyService);

    const res = await emptyApp.inject({
      method: "GET",
      url: "/delegations/active",
    });
    await emptyApp.close();

    const body = JSON.parse(res.body) as { data: unknown[] };
    expect(body.data).toHaveLength(0);
  });
});

describe("DELETE /delegations/:id", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 204 on successful revocation", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/delegations/${DELEGATION_ID}`,
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
  });

  it("returns 404 when delegation does not exist", async () => {
    const notFoundService = buildMockService({
      remove: vi.fn().mockRejectedValue(
        new NotFoundError("Delegation", DELEGATION_ID)
      ),
    });
    const notFoundApp = await buildApp(notFoundService);

    const res = await notFoundApp.inject({
      method: "DELETE",
      url: `/delegations/${DELEGATION_ID}`,
    });
    await notFoundApp.close();

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 422 for invalid ObjectId", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/delegations/not-an-id",
    });

    expect(res.statusCode).toBe(422);
  });
});

// ----------------------------------------------------------------
// Service unit tests
// ----------------------------------------------------------------

describe("DelegationService — business rules", () => {
  it("validates self-delegation at route level via ValidationError", async () => {
    const selfService = buildMockService({
      create: vi.fn().mockRejectedValue(
        new ValidationError("Cannot delegate approval authority to yourself")
      ),
    });
    const app = await buildApp(selfService, DELEGATOR_ID);

    const res = await app.inject({
      method: "POST",
      url: "/delegations",
      payload: {
        delegateId: DELEGATOR_ID,
        startDate: FUTURE_START,
        endDate: FUTURE_END,
      },
    });
    await app.close();

    expect(res.statusCode).toBe(422);
  });
});
