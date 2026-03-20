/**
 * Route-level tests for employee routes.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { createEmployeeRoutes } from "./employee.routes.js";
import type { EmployeeService } from "./employee.service.js";
import type { EmployeeRecord, PaginatedResult, CsvImportResult } from "./employee.types.js";

const VALID_MONGO_ID = "507f1f77bcf86cd799439011";

function buildEmployeeRecord(
  overrides: Partial<EmployeeRecord> = {}
): EmployeeRecord {
  return {
    id: VALID_MONGO_ID,
    tenantId: "tenant-001",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "Smith",
    displayName: "Alice Smith",
    role: "employee",
    teamId: null,
    firebaseUid: null,
    startDate: new Date("2023-01-01"),
    primaryPlatform: "email",
    timezone: "UTC",
    profileImageUrl: null,
    invitationToken: null,
    invitationExpiresAt: null,
    invitationStatus: "pending",
    status: "active",
    deactivatedAt: null,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
    ...overrides,
  };
}

function buildMockService(
  overrides: Partial<EmployeeService> = {}
): EmployeeService {
  const paginatedResult: PaginatedResult<EmployeeRecord> = {
    data: [buildEmployeeRecord()],
    total: 1,
    page: 1,
    limit: 20,
  };

  const csvResult: CsvImportResult = { created: [], errors: [] };

  return {
    findAll: vi.fn().mockResolvedValue(paginatedResult),
    findById: vi.fn().mockResolvedValue(buildEmployeeRecord()),
    create: vi.fn().mockResolvedValue(buildEmployeeRecord()),
    update: vi.fn().mockResolvedValue(buildEmployeeRecord()),
    deactivate: vi.fn().mockResolvedValue(buildEmployeeRecord({ status: "inactive" })),
    invite: vi.fn().mockResolvedValue(buildEmployeeRecord({ status: "invited" })),
    importFromCsv: vi.fn().mockResolvedValue(csvResult),
    ...overrides,
  };
}

async function buildApp(
  service: EmployeeService,
  role = "hr_admin"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.addHook("onRequest", async (request) => {
    request.auth = { uid: "uid", tenantId: "tenant-001", employeeId: "emp-1", role };
  });
  await app.register(createEmployeeRoutes(service));
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// GET /employees
// ----------------------------------------------------------------

describe("GET /employees", () => {
  let app: FastifyInstance;

  beforeAll(async () => { app = await buildApp(buildMockService()); });
  afterAll(async () => { await app.close(); });

  it("returns 200 with paginated list", async () => {
    const res = await app.inject({ method: "GET", url: "/employees" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: unknown[];
      meta: { total: number };
    };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.meta).toBeDefined();
  });

  it("passes filters to service", async () => {
    const service = buildMockService();
    const app = await buildApp(service);
    await app.inject({
      method: "GET",
      url: "/employees?status=active&role=manager&teamId=" + VALID_MONGO_ID,
    });
    expect(service.findAll).toHaveBeenCalledWith(
      "tenant-001",
      expect.objectContaining({ status: "active", role: "manager" }),
      expect.any(Object)
    );
    await app.close();
  });
});

// ----------------------------------------------------------------
// GET /employees/:id
// ----------------------------------------------------------------

describe("GET /employees/:id", () => {
  it("returns 200", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: `/employees/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 422 for invalid ID", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "GET", url: "/employees/bad-id" });
    expect(res.statusCode).toBe(422);
    await app.close();
  });

  it("returns 404 when not found", async () => {
    const service = buildMockService({
      findById: vi.fn().mockRejectedValue(new Error(`Employee not found: ${VALID_MONGO_ID}`)),
    });
    const app = await buildApp(service);
    const res = await app.inject({ method: "GET", url: `/employees/${VALID_MONGO_ID}` });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /employees
// ----------------------------------------------------------------

describe("POST /employees", () => {
  const validBody = {
    email: "bob@example.com",
    name: "Bob Jones",
    startDate: "2024-01-15",
    role: "employee",
  };

  it("returns 201 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({ method: "POST", url: "/employees", payload: validBody });
    expect(res.statusCode).toBe(201);
    await app.close();
  });

  it("returns 403 for employee role", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({ method: "POST", url: "/employees", payload: validBody });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 for missing email", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/employees",
      payload: { name: "Bob", startDate: "2024-01-01" },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});

// ----------------------------------------------------------------
// PATCH /employees/:id
// ----------------------------------------------------------------

describe("PATCH /employees/:id", () => {
  it("returns 200 for hr_admin", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "PATCH",
      url: `/employees/${VALID_MONGO_ID}`,
      payload: { role: "manager" },
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for manager", async () => {
    const app = await buildApp(buildMockService(), "manager");
    const res = await app.inject({
      method: "PATCH",
      url: `/employees/${VALID_MONGO_ID}`,
      payload: { role: "employee" },
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /employees/:id/deactivate
// ----------------------------------------------------------------

describe("POST /employees/:id/deactivate", () => {
  it("returns 200 with deactivated employee", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: `/employees/${VALID_MONGO_ID}/deactivate`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { data: { status: string } };
    expect(body.data.status).toBe("inactive");
    await app.close();
  });

  it("returns 403 for employee role", async () => {
    const app = await buildApp(buildMockService(), "employee");
    const res = await app.inject({
      method: "POST",
      url: `/employees/${VALID_MONGO_ID}/deactivate`,
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// POST /employees/import
// ----------------------------------------------------------------

describe("POST /employees/import", () => {
  it("returns 200 with import result", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/employees/import",
      payload: [
        { email: "test@example.com", firstName: "Test", lastName: "User", startDate: "2024-01-01" },
      ],
    });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for manager role", async () => {
    const app = await buildApp(buildMockService(), "manager");
    const res = await app.inject({
      method: "POST",
      url: "/employees/import",
      payload: [],
    });
    expect(res.statusCode).toBe(403);
    await app.close();
  });

  it("returns 422 when body is not an array", async () => {
    const app = await buildApp(buildMockService());
    const res = await app.inject({
      method: "POST",
      url: "/employees/import",
      payload: { notAnArray: true },
    });
    expect(res.statusCode).toBe(422);
    await app.close();
  });
});
