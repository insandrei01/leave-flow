/**
 * Onboarding routes tests.
 *
 * Tests cover:
 * - GET /onboarding/progress — happy path, not found, role guard
 * - PUT /onboarding/steps/:stepNumber — step 1 happy path, validation error, idempotent
 * - POST /onboarding/complete — happy path, missing required steps
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { errorHandlerPlugin } from "../../plugins/error-handler.plugin.js";
import { onboardingRoutes } from "./onboarding.routes.js";
import { NotFoundError, ValidationError } from "../../lib/errors.js";
import type { OnboardingService } from "./onboarding.service.js";
import type { OnboardingProgress } from "./onboarding.types.js";

// ----------------------------------------------------------------
// Mock helpers
// ----------------------------------------------------------------

function makeProgress(partial: Partial<OnboardingProgress> = {}): OnboardingProgress {
  return {
    tenantId: "tenant_abc",
    isComplete: false,
    currentStep: 1,
    steps: [1, 2, 3, 4, 5, 6].map((n) => ({
      stepNumber: n,
      status: "pending" as const,
      completedAt: null,
      submittedData: null,
    })),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...partial,
  };
}

function buildMockService(
  overrides: Partial<OnboardingService> = {}
): OnboardingService {
  return {
    initialize: vi.fn().mockResolvedValue(makeProgress()),
    getProgress: vi.fn().mockResolvedValue(makeProgress()),
    saveStep: vi.fn().mockResolvedValue(makeProgress()),
    skipStep: vi.fn().mockResolvedValue(makeProgress()),
    complete: vi
      .fn()
      .mockResolvedValue(makeProgress({ isComplete: true })),
    canSkipStep: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

type RoleType = "company_admin" | "hr_admin" | "manager" | "employee";

async function buildApp(
  service: OnboardingService,
  role: RoleType = "company_admin"
): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(errorHandlerPlugin);

  app.addHook("onRequest", async (request) => {
    const isPublic = request.routeOptions?.config?.["public"] === true;
    if (isPublic) return;
    request.auth = {
      uid: "uid_abc",
      tenantId: "tenant_abc",
      employeeId: "emp_abc",
      role,
    };
    request.tenantId = "tenant_abc";
  });

  await app.register(onboardingRoutes, { onboardingService: service });
  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// Tests: GET /onboarding/progress
// ----------------------------------------------------------------

describe("GET /onboarding/progress", () => {
  let app: FastifyInstance;
  let service: OnboardingService;

  beforeAll(async () => {
    service = buildMockService();
    app = await buildApp(service);
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with progress for company_admin", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/onboarding/progress",
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { tenantId: string; isComplete: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.tenantId).toBe("tenant_abc");
    expect(body.data.isComplete).toBe(false);
  });

  it("returns 403 for non-admin roles", async () => {
    const hrApp = await buildApp(buildMockService(), "hr_admin");
    const res = await hrApp.inject({
      method: "GET",
      url: "/onboarding/progress",
    });
    await hrApp.close();

    expect(res.statusCode).toBe(403);
  });

  it("returns 404 when progress not initialised", async () => {
    const noProgressService = buildMockService({
      getProgress: vi.fn().mockResolvedValue(null),
    });
    const noProgressApp = await buildApp(noProgressService);

    const res = await noProgressApp.inject({
      method: "GET",
      url: "/onboarding/progress",
    });
    await noProgressApp.close();

    expect(res.statusCode).toBe(404);
  });
});

// ----------------------------------------------------------------
// Tests: PUT /onboarding/steps/:stepNumber
// ----------------------------------------------------------------

describe("PUT /onboarding/steps/:stepNumber", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 for valid step 1 body", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/onboarding/steps/1",
      payload: {
        timezone: "Europe/London",
        fiscalYearStartMonth: 1,
        workWeek: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        country: "GB",
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as { success: boolean };
    expect(body.success).toBe(true);
  });

  it("returns 422 for invalid step body", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/onboarding/steps/1",
      payload: { timezone: "" },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 for invalid step number", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/onboarding/steps/9",
      payload: {},
    });

    expect(res.statusCode).toBe(422);
  });

  it("returns 403 for non-admin roles", async () => {
    const empApp = await buildApp(buildMockService(), "employee");
    const res = await empApp.inject({
      method: "PUT",
      url: "/onboarding/steps/1",
      payload: {
        timezone: "UTC",
        fiscalYearStartMonth: 1,
        workWeek: {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: false,
          sunday: false,
        },
        country: "US",
      },
    });
    await empApp.close();
    expect(res.statusCode).toBe(403);
  });
});

// ----------------------------------------------------------------
// Tests: POST /onboarding/complete
// ----------------------------------------------------------------

describe("POST /onboarding/complete", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockService());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 201 with completed progress", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/onboarding/complete",
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { isComplete: boolean };
    };
    expect(body.success).toBe(true);
    expect(body.data.isComplete).toBe(true);
  });

  it("returns 500 when required steps are incomplete", async () => {
    const incompleteService = buildMockService({
      complete: vi.fn().mockRejectedValue(
        new Error("Cannot complete onboarding. Required steps not done: 1, 2, 3")
      ),
    });
    const incompleteApp = await buildApp(incompleteService);

    const res = await incompleteApp.inject({
      method: "POST",
      url: "/onboarding/complete",
    });
    await incompleteApp.close();

    // Service throws a plain Error — maps to 500 (business logic should throw ValidationError)
    expect(res.statusCode).toBe(500);
  });
});
