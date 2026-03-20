/**
 * Route-level tests for tenant routes.
 * Services are mocked — no DB connection required.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { createTenantRoutes } from "./tenant.routes.js";
import type { TenantService } from "./tenant.service.js";
import type { TenantRecord, PlanLimits } from "./tenant.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildTenantRecord(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: "tenant-001",
    name: "Acme Corp",
    slug: "acme-corp",
    plan: "business",
    isActive: true,
    settings: {
      timezone: "UTC",
      fiscalYearStartMonth: 1,
      workWeek: [1, 2, 3, 4, 5],
      coverageMinimumPercent: 50,
      announcementChannelEnabled: true,
      locale: "en",
    },
    planLimits: {
      maxEmployees: 250,
      maxWorkflowSteps: 5,
      maxLeaveTypes: 20,
      maxPlatforms: 3,
    },
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
    ...overrides,
  };
}

const PLAN_LIMITS: PlanLimits = {
  maxEmployees: 250,
  maxWorkflowSteps: 5,
  maxLeaveTypes: 20,
  maxPlatforms: 3,
};

function buildMockService(
  overrides: Partial<TenantService> = {}
): TenantService {
  return {
    createTenant: vi.fn().mockResolvedValue(buildTenantRecord()),
    updateSettings: vi.fn().mockResolvedValue(buildTenantRecord()),
    getPlanLimits: vi.fn().mockResolvedValue(PLAN_LIMITS),
    ...overrides,
  };
}

// ----------------------------------------------------------------
// App factory
// ----------------------------------------------------------------

async function buildApp(
  service: TenantService,
  role = "hr_admin",
  tenantId = "tenant-001"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.addHook("onRequest", async (request) => {
    request.auth = {
      uid: "test-uid",
      tenantId,
      employeeId: "emp-1",
      role,
    };
  });

  await app.register(createTenantRoutes(service));
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// GET /tenants/current
// ----------------------------------------------------------------

describe("GET /tenants/current", () => {
  let app: FastifyInstance;
  let service: TenantService;

  beforeAll(async () => {
    service = buildMockService();
    app = await buildApp(service);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with plan limits", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/tenants/current",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      success: boolean;
      data: PlanLimits;
    };
    expect(body.success).toBe(true);
    expect(body.data.maxEmployees).toBe(250);
  });

  it("returns 200 for any authenticated role", async () => {
    const employeeApp = await buildApp(buildMockService(), "employee");
    const response = await employeeApp.inject({
      method: "GET",
      url: "/tenants/current",
    });
    expect(response.statusCode).toBe(200);
    await employeeApp.close();
  });
});

// ----------------------------------------------------------------
// PATCH /tenants/current
// ----------------------------------------------------------------

describe("PATCH /tenants/current", () => {
  it("returns 200 for company_admin", async () => {
    const service = buildMockService();
    const app = await buildApp(service, "company_admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current",
      payload: { name: "New Name", timezone: "America/New_York" },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for hr_admin", async () => {
    const service = buildMockService();
    const app = await buildApp(service, "hr_admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current",
      payload: { name: "New Name" },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const service = buildMockService();
    const app = await buildApp(service, "employee");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current",
      payload: { name: "New Name" },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });
});

// ----------------------------------------------------------------
// PATCH /tenants/current/settings
// ----------------------------------------------------------------

describe("PATCH /tenants/current/settings", () => {
  it("returns 200 for hr_admin", async () => {
    const service = buildMockService();
    const app = await buildApp(service, "hr_admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current/settings",
      payload: {
        timezone: "Europe/Berlin",
        fiscalYearStartMonth: 4,
        workWeek: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
      },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("returns 200 for company_admin", async () => {
    const service = buildMockService();
    const app = await buildApp(service, "company_admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current/settings",
      payload: {
        timezone: "UTC",
        fiscalYearStartMonth: 1,
        workWeek: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
      },
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });

  it("returns 403 for employee", async () => {
    const service = buildMockService();
    const app = await buildApp(service, "employee");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current/settings",
      payload: { timezone: "UTC" },
    });

    expect(response.statusCode).toBe(403);
    await app.close();
  });

  it("returns error envelope on service error", async () => {
    const service = buildMockService({
      updateSettings: vi
        .fn()
        .mockRejectedValue(new Error("Tenant not found: missing")),
    });
    const app = await buildApp(service, "hr_admin");

    const response = await app.inject({
      method: "PATCH",
      url: "/tenants/current/settings",
      payload: {
        timezone: "UTC",
        fiscalYearStartMonth: 1,
        workWeek: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.body) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("NOT_FOUND");
    await app.close();
  });
});
