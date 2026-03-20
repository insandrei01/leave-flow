import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { createTestApp } from "../../../test/helpers/supertest.helper.js";

describe("GET /health", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns 200 with uptime and version", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.body) as {
      status: string;
      uptime: number;
      version: string;
      timestamp: string;
    };

    expect(body.status).toBe("ok");
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(typeof body.version).toBe("string");
    expect(typeof body.timestamp).toBe("string");
  });

  it("marks the health route as public (no auth required)", async () => {
    // Health route must not require Authorization header
    const response = await app.inject({
      method: "GET",
      url: "/health",
      // Intentionally no Authorization header
    });

    expect(response.statusCode).toBe(200);
  });
});
