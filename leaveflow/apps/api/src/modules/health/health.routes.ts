/**
 * Health check routes.
 *
 * GET /health      — basic liveness probe (no dependencies)
 * GET /health/deep — full readiness probe (DB + Redis connectivity)
 *
 * Both routes are marked public so they bypass authentication.
 */

import type { FastifyInstance } from "fastify";
import mongoose from "mongoose";

const APP_VERSION = process.env["npm_package_version"] ?? "0.0.0";
const START_TIME = Date.now();

/** Milliseconds before a dependency check is considered timed out */
const CHECK_TIMEOUT_MS = 3000;

// ----------------------------------------------------------------
// Dependency checkers
// ----------------------------------------------------------------

async function checkMongodb(): Promise<{
  status: "ok" | "error";
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    await Promise.race([
      mongoose.connection.db?.admin().ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS)
      ),
    ]);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkRedis(
  app: FastifyInstance
): Promise<{ status: "ok" | "error"; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    // Access the decorated redis client if registered, otherwise skip
    const redis = (app as unknown as Record<string, unknown>)["redis"];
    if (redis === undefined || redis === null) {
      return { status: "ok", latencyMs: 0 };
    }

    await Promise.race([
      (redis as { ping(): Promise<string> }).ping(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS)
      ),
    ]);
    return { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      status: "error",
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// ----------------------------------------------------------------
// Routes
// ----------------------------------------------------------------

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // GET /health — liveness (fast, no DB)
  app.get(
    "/health",
    {
      config: { public: true },
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              status: { type: "string" },
              uptime: { type: "number" },
              version: { type: "string" },
              timestamp: { type: "string" },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      return reply.code(200).send({
        status: "ok",
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
      });
    }
  );

  // GET /health/deep — readiness (checks DB + Redis)
  app.get(
    "/health/deep",
    { config: { public: true } },
    async (_request, reply) => {
      const [mongoStatus, redisStatus] = await Promise.all([
        checkMongodb(),
        checkRedis(app),
      ]);

      const allHealthy =
        mongoStatus.status === "ok" && redisStatus.status === "ok";

      const payload = {
        status: allHealthy ? "ok" : "degraded",
        uptime: Math.floor((Date.now() - START_TIME) / 1000),
        version: APP_VERSION,
        timestamp: new Date().toISOString(),
        dependencies: {
          mongodb: mongoStatus,
          redis: redisStatus,
        },
      };

      return reply.code(allHealthy ? 200 : 503).send(payload);
    }
  );
}
