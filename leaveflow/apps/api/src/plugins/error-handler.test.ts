import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ZodError, z } from "zod";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";
import { errorHandlerPlugin } from "./error-handler.plugin.js";

describe("errorHandlerPlugin", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({ logger: false });
    await app.register(errorHandlerPlugin);

    // Routes that throw different error types for testing
    app.get("/throw-zod", async () => {
      const schema = z.object({ name: z.string().min(3) });
      schema.parse({ name: "ab" }); // triggers ZodError
    });

    app.get("/throw-not-found", async (_req, reply) => {
      return reply.code(404).send({
        success: false,
        data: null,
        error: { code: "NOT_FOUND", message: "Resource not found", details: null },
      });
    });

    app.get("/throw-generic", async () => {
      throw new Error("internal failure");
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("handles ZodError and returns 400 with field-level details", async () => {
    const response = await app.inject({ method: "GET", url: "/throw-zod" });
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as {
      success: boolean;
      error: { code: string; details: unknown };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toBeDefined();
  });

  it("handles generic errors and returns 500 without leaking internals", async () => {
    const response = await app.inject({ method: "GET", url: "/throw-generic" });
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body) as {
      success: boolean;
      error: { code: string; message: string };
    };
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    // Must not leak the raw error message
    expect(body.error.message).not.toBe("internal failure");
  });

  it("passes through 404 responses unchanged", async () => {
    const response = await app.inject({ method: "GET", url: "/throw-not-found" });
    expect(response.statusCode).toBe(404);
  });
});
