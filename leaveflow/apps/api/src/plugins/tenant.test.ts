import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { tenantPlugin } from "./tenant.plugin.js";

describe("tenantPlugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });

    // Simulate auth plugin having run and attached request.auth
    app.addHook("onRequest", async (req) => {
      // Default: authenticated with tenantId
      if (!req.headers["x-skip-auth"]) {
        req.auth = {
          uid: "user-1",
          tenantId: "tenant-abc",
          employeeId: "emp-1",
          role: "employee",
        };
      }
    });

    await app.register(tenantPlugin);

    app.get("/protected", async (req) => {
      return { tenantId: req.tenantId };
    });

    app.get("/public", { config: { public: true } }, async () => {
      return { ok: true };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("attaches tenantId from auth to request", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as { tenantId: string };
    expect(body.tenantId).toBe("tenant-abc");
  });

  it("returns 403 when tenantId is missing and route is not public", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { "x-skip-auth": "1" },
    });

    expect(response.statusCode).toBe(403);
    const body = JSON.parse(response.body) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows public routes without tenantId", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/public",
      headers: { "x-skip-auth": "1" },
    });

    expect(response.statusCode).toBe(200);
  });
});
