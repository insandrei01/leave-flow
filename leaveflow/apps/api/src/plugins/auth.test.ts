import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { authPlugin } from "./auth.plugin.js";

// Mock firebase-admin module before importing the plugin
vi.mock("../lib/firebase-admin.js", () => ({
  verifyIdToken: vi.fn(),
}));

import { verifyIdToken } from "../lib/firebase-admin.js";

const mockVerify = vi.mocked(verifyIdToken);

describe("authPlugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(authPlugin);

    // Protected route
    app.get("/protected", async (req) => {
      return { auth: req.auth };
    });

    // Public route
    app.get("/public", { config: { public: true } }, async () => {
      return { ok: true };
    });

    // Bot webhook routes (skipped)
    app.post("/slack/events", async () => {
      return { ok: true };
    });

    app.post("/teams/webhook", async () => {
      return { ok: true };
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("passes when a valid Bearer token is provided", async () => {
    mockVerify.mockResolvedValueOnce({
      uid: "user-1",
      tenantId: "tenant-abc",
      employeeId: "emp-1",
      role: "employee",
    });

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer valid-token" },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body) as {
      auth: { uid: string; tenantId: string };
    };
    expect(body.auth.uid).toBe("user-1");
    expect(body.auth.tenantId).toBe("tenant-abc");
  });

  it("returns 401 when Authorization header is missing", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/protected",
    });

    expect(response.statusCode).toBe(401);
    const body = JSON.parse(response.body) as {
      success: boolean;
      error: { code: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns 401 when token verification fails", async () => {
    mockVerify.mockRejectedValueOnce(new Error("Token expired"));

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer expired-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 401 when tenantId claim is missing", async () => {
    mockVerify.mockResolvedValueOnce({
      uid: "user-1",
      tenantId: undefined,
      employeeId: undefined,
      role: undefined,
    });

    const response = await app.inject({
      method: "GET",
      url: "/protected",
      headers: { authorization: "Bearer no-claims-token" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("skips auth for routes marked public", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/public",
    });

    expect(response.statusCode).toBe(200);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("skips auth for Slack webhook routes", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/slack/events",
    });

    expect(response.statusCode).toBe(200);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("skips auth for Teams webhook routes", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/teams/webhook",
    });

    expect(response.statusCode).toBe(200);
    expect(mockVerify).not.toHaveBeenCalled();
  });
});
