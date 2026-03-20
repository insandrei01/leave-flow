/**
 * Tests for the rate limiter plugin.
 *
 * Uses a Fastify test instance with the plugin registered.
 * Mocks @fastify/rate-limit to avoid needing a real Redis connection.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

// ----------------------------------------------------------------
// Mock @fastify/rate-limit
// NOTE: vi.mock is hoisted to the top of the file by vitest.
// The factory must not reference block-scoped variables defined
// after the mock call — use module-level state instead.
// ----------------------------------------------------------------

let capturedOpts: {
  max?: (req: FastifyRequest, key: string) => Promise<number> | number;
  keyGenerator?: (req: FastifyRequest) => string;
  errorResponseBuilder?: (
    req: FastifyRequest,
    ctx: { max: number; after: string }
  ) => unknown;
} = {};

vi.mock("@fastify/rate-limit", () => {
  return {
    default: fp(
      async (
        app: FastifyInstance,
        opts: typeof capturedOpts
      ) => {
        capturedOpts = opts;

        // Simulate rate limiting based on a test header
        app.addHook(
          "onRequest",
          async (request: FastifyRequest, reply) => {
            if (request.headers["x-simulate-rate-limit"] === "1") {
              const maxVal = opts.max
                ? await opts.max(request, "test-key")
                : 60;
              const body = opts.errorResponseBuilder
                ? opts.errorResponseBuilder(request, { max: maxVal, after: "60s" })
                : { error: "rate limited" };
              void reply
                .code(429)
                .header("X-RateLimit-Limit", String(maxVal))
                .send(body);
            }
          }
        );
      },
      { fastify: "5.x", name: "mock-rate-limit" }
    ),
  };
});

// Import AFTER mocking
import { rateLimiterPlugin } from "./rate-limiter.plugin.js";

// ----------------------------------------------------------------
// Test app factory
// ----------------------------------------------------------------

async function buildTestApp(
  authOverrides: { role?: string; tenantId?: string; employeeId?: string } = {},
  pluginOpts: Parameters<typeof rateLimiterPlugin>[1] = {}
): Promise<FastifyInstance> {
  capturedOpts = {};
  const app = Fastify({ logger: false });

  await app.register(rateLimiterPlugin, pluginOpts);

  // Stub auth on every request
  app.addHook("onRequest", async (request) => {
    if (request.headers["x-no-auth"] !== "1") {
      request.auth = {
        uid: "test-uid",
        tenantId: authOverrides.tenantId ?? "tenant-1",
        employeeId: authOverrides.employeeId ?? "emp-1",
        role: authOverrides.role ?? "employee",
      };
    }
  });

  app.get("/test", async () => ({ ok: true }));
  app.post("/slack/events", async () => ({ ok: true }));
  app.post("/teams/webhook", async () => ({ ok: true }));

  await app.ready();
  return app;
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("rateLimiterPlugin — registration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("registers without error", () => {
    expect(app).toBeDefined();
  });

  it("allows requests that have not hit the limit", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test",
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("rateLimiterPlugin — 429 response format", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildTestApp({ role: "employee" });
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 429 with standard error envelope when rate limit is simulated", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "x-simulate-rate-limit": "1" },
    });

    expect(response.statusCode).toBe(429);

    const body = JSON.parse(response.body) as {
      success: boolean;
      data: null;
      error: { code: string; message: string };
      meta: null;
    };

    expect(body.success).toBe(false);
    expect(body.data).toBeNull();
    expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(body.error.message).toContain("Too many requests");
    expect(body.meta).toBeNull();
  });

  it("includes X-RateLimit-Limit header in 429 response", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/test",
      headers: { "x-simulate-rate-limit": "1" },
    });

    expect(response.statusCode).toBe(429);
    const limit =
      response.headers["x-ratelimit-limit"] ??
      response.headers["X-RateLimit-Limit"];
    expect(limit).toBeDefined();
  });
});

describe("rateLimiterPlugin — plan limits (async max)", () => {
  it("uses DEFAULT_LIMIT (60) when no tenant model provided and tenantId present", async () => {
    const app = await buildTestApp({ tenantId: "t1" });

    const fakeRequest = {
      url: "/test",
      ip: "127.0.0.1",
      auth: { role: "employee", tenantId: "t1", employeeId: "e1", uid: "u1" },
    } as unknown as FastifyRequest;

    // No tenantPlanModel provided — falls back to DEFAULT_LIMIT
    const result = await capturedOpts.max!(fakeRequest, "t1:e1");
    expect(result).toBe(60);
    await app.close();
  });

  it("resolves plan from tenant model and returns correct limit", async () => {
    const mockTenantPlanModel = {
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ plan: "enterprise" }),
      }),
    };

    const app = await buildTestApp({ tenantId: "t-ent" }, { tenantPlanModel: mockTenantPlanModel });

    const fakeRequest = {
      url: "/test",
      ip: "127.0.0.1",
      auth: { role: "employee", tenantId: "t-ent", employeeId: "e1", uid: "u1" },
    } as unknown as FastifyRequest;

    const result = await capturedOpts.max!(fakeRequest, "t-ent:e1");
    expect(result).toBe(1200); // enterprise limit
    await app.close();
  });

  it("resolves team plan and returns 300", async () => {
    const mockTenantPlanModel = {
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ plan: "team" }),
      }),
    };

    const app = await buildTestApp({ tenantId: "t-team" }, { tenantPlanModel: mockTenantPlanModel });

    const fakeRequest = {
      url: "/test",
      ip: "127.0.0.1",
      auth: { role: "employee", tenantId: "t-team", employeeId: "e1", uid: "u1" },
    } as unknown as FastifyRequest;

    const result = await capturedOpts.max!(fakeRequest, "t-team:e1");
    expect(result).toBe(300);
    await app.close();
  });

  it("falls back to DEFAULT_LIMIT when tenant not found in DB", async () => {
    const mockTenantPlanModel = {
      findOne: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    };

    const app = await buildTestApp({ tenantId: "t-missing" }, { tenantPlanModel: mockTenantPlanModel });

    const fakeRequest = {
      url: "/test",
      ip: "127.0.0.1",
      auth: { role: "employee", tenantId: "t-missing", employeeId: "e1", uid: "u1" },
    } as unknown as FastifyRequest;

    const result = await capturedOpts.max!(fakeRequest, "t-missing:e1");
    expect(result).toBe(60); // DEFAULT_LIMIT
    await app.close();
  });

  it("uses limit 1000 for bot webhook paths regardless of plan", async () => {
    const app = await buildTestApp();

    const slackRequest = {
      url: "/slack/events",
      ip: "127.0.0.1",
      auth: undefined,
    } as unknown as FastifyRequest;

    const result = await capturedOpts.max!(slackRequest, "bot:127.0.0.1");
    expect(result).toBe(1000);
    await app.close();
  });

  it("uses limit 10 for auth paths", async () => {
    const app = await buildTestApp();

    const authRequest = {
      url: "/auth/login",
      ip: "127.0.0.1",
      auth: undefined,
    } as unknown as FastifyRequest;

    const result = await capturedOpts.max!(authRequest, "auth:127.0.0.1");
    expect(result).toBe(10);
    await app.close();
  });

  it("uses DEFAULT_LIMIT when no tenantId in auth context", async () => {
    const app = await buildTestApp();

    const anonRequest = {
      url: "/test",
      ip: "127.0.0.1",
      auth: undefined,
    } as unknown as FastifyRequest;

    const result = await capturedOpts.max!(anonRequest, "anon:127.0.0.1");
    expect(result).toBe(60);
    await app.close();
  });
});

describe("rateLimiterPlugin — key generation", () => {
  it("uses tenantId:employeeId key for authenticated requests", async () => {
    const app = await buildTestApp({ tenantId: "t-123", employeeId: "e-456" });

    const fakeRequest = {
      url: "/test",
      ip: "1.2.3.4",
      auth: { tenantId: "t-123", employeeId: "e-456", role: "employee", uid: "u1" },
    } as unknown as FastifyRequest;

    expect(capturedOpts.keyGenerator!(fakeRequest)).toBe("t-123:e-456");
    await app.close();
  });

  it("uses bot:ip key for bot webhook paths", async () => {
    const app = await buildTestApp();

    const botRequest = {
      url: "/slack/events",
      ip: "10.0.0.1",
      auth: undefined,
    } as unknown as FastifyRequest;

    expect(capturedOpts.keyGenerator!(botRequest)).toBe("bot:10.0.0.1");
    await app.close();
  });

  it("uses anon:ip key for unauthenticated requests", async () => {
    const app = await buildTestApp();

    const anonRequest = {
      url: "/test",
      ip: "9.9.9.9",
      auth: undefined,
    } as unknown as FastifyRequest;

    expect(capturedOpts.keyGenerator!(anonRequest)).toBe("anon:9.9.9.9");
    await app.close();
  });
});
