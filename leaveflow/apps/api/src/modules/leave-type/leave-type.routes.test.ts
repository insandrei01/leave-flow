/**
 * Route-level tests for leave-type routes.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { createLeaveTypeRoutes } from "./leave-type.routes.js";
import type { LeaveTypeService } from "./leave-type.service.js";
import type { LeaveTypeRecord } from "./leave-type.types.js";

const VALID_MONGO_ID = "507f1f77bcf86cd799439011";

function buildRecord(overrides: Partial<LeaveTypeRecord> = {}): LeaveTypeRecord {
  return {
    id: VALID_MONGO_ID,
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
    isDefault: false,
    sortOrder: 0,
    isActive: true,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

function buildMockService(
  overrides: Partial<LeaveTypeService> = {}
): LeaveTypeService {
  return {
    findAll: vi.fn().mockResolvedValue([buildRecord()]),
    findById: vi.fn().mockResolvedValue(buildRecord()),
    create: vi.fn().mockResolvedValue(buildRecord()),
    update: vi.fn().mockResolvedValue(buildRecord()),
    delete: vi.fn().mockResolvedValue(undefined),
    seedDefaults: vi.fn().mockResolvedValue([buildRecord()]),
    ...overrides,
  };
}

async function buildApp(
  service: LeaveTypeService,
  role = "hr_admin"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    request.auth = {
      uid: "uid",
      tenantId: "tenant-001",
      employeeId: "emp-1",
      role,
    };
  });
  await app.register(createLeaveTypeRoutes(service));
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// GET /leave-types
// ----------------------------------------------------------------

describe("GET /leave-types", () => {
  let app: FastifyInstance;
  let service: LeaveTypeService;

  beforeAll(async () => {
    service = buildMockService();
    app = await buildApp(service);
  });

  afterAll(async () => { await app.close(); });

  it("returns 200 with list", async () => {
    const res = await app.inject({ method: "GET", url: "/leave-types" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean; data: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("is accessible by any role", async () => {
    const appEmp = await buildApp(buildMockService(), "employee");
    const res = await appEmp.inject({ method: "GET", url: "/leave-types" });
    expect(res.statusCode).toBe(200);
    await appEmp.close();
  });
});

// ----------------------------------------------------------------
// GET /leave-types/:id
// ----------------------------------------------------------------

describe("GET /leave-types/:id", () => {
  it("returns 200 with record", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "GET",
      url: `/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 422 for invalid ID format", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "GET",
      url: "/leave-types/not-an-id",
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 404 when service throws not found", async () => {
    const service = buildMockService({
      findById: vi.fn().mockRejectedValue(new Error(`Leave type not found: ${VALID_MONGO_ID}`)),
    });
    const app = await buildApp(service);
    const res = await app.inject({
      method: "GET",
      url: `/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /leave-types
// ----------------------------------------------------------------

describe("POST /leave-types", () => {
  const validBody = {
    name: "Parental Leave",
    isPaid: true,
    requiresApproval: true,
    defaultEntitlementDays: 90,
  };

  it("returns 201 for hr_admin", async () => {
    const app = await buildApp(buildMockService(), "hr_admin");
    const res = await app.inject({
      method: "POST",
      url: "/leave-types",
      payload: validBody,
    });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({
      method: "POST",
      url: "/leave-types",
      payload: validBody,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 for missing required fields", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/leave-types",
      payload: { name: "Missing fields" },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 409 when name already exists", async () => {
    const service = buildMockService({
      create: vi.fn().mockRejectedValue(
        new Error('Leave type with name "Parental Leave" already exists for this tenant')
      ),
    });
    const app = await buildApp(service);
    const res = await app.inject({
      method: "POST",
      url: "/leave-types",
      payload: validBody,
    });
    expect(res.statusCode).toBe(409);
    await app.close();
  });
});

// ----------------------------------------------------------------
// PATCH /leave-types/:id
// ----------------------------------------------------------------

describe("PATCH /leave-types/:id", () => {
  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "PATCH",
      url: `/leave-types/${VALID_MONGO_ID}`,
      payload: { name: "Updated Leave" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for manager", async () => {
    const app = await buildApp(buildMockService(), "manager");
    const res = await app.inject({
      method: "PATCH",
      url: `/leave-types/${VALID_MONGO_ID}`,
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// DELETE /leave-types/:id
// ----------------------------------------------------------------

describe("DELETE /leave-types/:id", () => {
  it("returns 204 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "DELETE",
      url: `/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(204);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({
      method: "DELETE",
      url: `/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 404 when service throws not found", async () => {
    const service = buildMockService({
      delete: vi.fn().mockRejectedValue(new Error(`Leave type not found: ${VALID_MONGO_ID}`)),
    });
    const app = await buildApp(service);
    const res = await app.inject({
      method: "DELETE",
      url: `/leave-types/${VALID_MONGO_ID}`,
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});
