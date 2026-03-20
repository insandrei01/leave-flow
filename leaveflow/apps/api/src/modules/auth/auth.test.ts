/**
 * Auth routes tests.
 *
 * Tests cover:
 * - POST /auth/register happy path
 * - POST /auth/register validation errors (missing fields, weak password)
 * - POST /auth/register conflict (email already registered)
 * - GET /auth/me happy path
 * - GET /auth/me without auth (401)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { errorHandlerPlugin } from "../../plugins/error-handler.plugin.js";
import { authRoutes } from "./auth.routes.js";
import { ConflictError, NotFoundError } from "../../lib/errors.js";
import type { AuthService } from "./auth.service.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function buildMockAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    register: vi.fn().mockResolvedValue({
      tenantId: "tenant_abc",
      employeeId: "emp_abc",
      firebaseUid: "uid_abc",
      emailVerificationSent: false,
    }),
    getMe: vi.fn().mockResolvedValue({
      employeeId: "emp_abc",
      firebaseUid: "uid_abc",
      name: "Alice Admin",
      email: "alice@acme.com",
      role: "company_admin",
      tenantId: "tenant_abc",
      tenantName: "Acme Corp",
      teamId: null,
      primaryPlatform: "email",
      avatarUrl: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
    }),
    ...overrides,
  };
}

async function buildApp(authService: AuthService): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  await app.register(errorHandlerPlugin);

  // Minimal auth simulation — attach auth payload on non-public routes if
  // the test provides an Authorization header with value "Bearer valid"
  app.addHook("onRequest", async (request, reply) => {
    const isPublic = request.routeOptions?.config?.["public"] === true;
    if (isPublic) return;

    const authHeader = request.headers["authorization"];
    if (!authHeader || authHeader !== "Bearer valid") {
      void reply.code(401).send({
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Authentication required", details: null },
      });
      return;
    }
    request.auth = {
      uid: "uid_abc",
      tenantId: "tenant_abc",
      employeeId: "emp_abc",
      role: "company_admin",
    };
  });

  await app.register(authRoutes, { authService });

  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("POST /auth/register", () => {
  let app: FastifyInstance;
  let authService: AuthService;

  beforeAll(async () => {
    authService = buildMockAuthService();
    app = await buildApp(authService);
  });

  afterAll(async () => {
    await app.close();
  });

  const validBody = {
    companyName: "Acme Corp",
    adminEmail: "alice@acme.com",
    adminName: "Alice Admin",
    password: "Password1",
    timezone: "UTC",
  };

  it("returns 201 with envelope on success", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: validBody,
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: { tenantId: string; employeeId: string; firebaseUid: string };
      error: null;
    };
    expect(body.success).toBe(true);
    expect(body.data.tenantId).toBe("tenant_abc");
    expect(body.data.employeeId).toBe("emp_abc");
    expect(body.error).toBeNull();
  });

  it("returns 422 when companyName is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { ...validBody, companyName: undefined },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when password is too short", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { ...validBody, password: "short" },
    });

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 422 when email is invalid", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { ...validBody, adminEmail: "not-an-email" },
    });

    expect(res.statusCode).toBe(422);
  });

  it("returns 409 when email is already registered", async () => {
    const conflictService = buildMockAuthService({
      register: vi.fn().mockRejectedValue(
        new ConflictError(
          "Email address already registered",
          "EMAIL_ALREADY_REGISTERED"
        )
      ),
    });
    const conflictApp = await buildApp(conflictService);

    const res = await conflictApp.inject({
      method: "POST",
      url: "/auth/register",
      payload: validBody,
    });

    await conflictApp.close();

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body) as {
      error: { code: string };
    };
    expect(body.error.code).toBe("EMAIL_ALREADY_REGISTERED");
  });
});

describe("GET /auth/me", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp(buildMockAuthService());
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with employee profile when authenticated", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer valid" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body) as {
      success: boolean;
      data: {
        employeeId: string;
        email: string;
        role: string;
        tenantId: string;
      };
    };
    expect(body.success).toBe(true);
    expect(body.data.employeeId).toBe("emp_abc");
    expect(body.data.email).toBe("alice@acme.com");
    expect(body.data.role).toBe("company_admin");
  });

  it("returns 401 when no auth header is provided", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    expect(res.statusCode).toBe(401);
  });

  it("returns 404 when employee is not found", async () => {
    const notFoundService = buildMockAuthService({
      getMe: vi.fn().mockRejectedValue(new NotFoundError("Employee", "emp_abc")),
    });
    const notFoundApp = await buildApp(notFoundService);

    const res = await notFoundApp.inject({
      method: "GET",
      url: "/auth/me",
      headers: { authorization: "Bearer valid" },
    });

    await notFoundApp.close();

    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
