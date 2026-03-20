/**
 * Application entry point.
 *
 * Boots the Fastify server with graceful shutdown support:
 * - SIGINT / SIGTERM stop accepting new connections
 * - In-flight requests are drained before the process exits
 * - BullMQ queues are closed to prevent job loss
 */

import { loadConfig, validateRequiredEnvVars } from "./lib/config.js";
import { buildApp } from "./app.js";
import { ALL_QUEUES } from "./lib/bullmq.js";

/** Maximum milliseconds to wait for in-flight requests to drain */
const SHUTDOWN_TIMEOUT_MS = 30_000;

async function main(): Promise<void> {
  // Validate required env vars before doing anything else
  validateRequiredEnvVars();

  const config = loadConfig();
  const app = await buildApp();

  // ----------------------------------------------------------------
  // Graceful shutdown handler
  // ----------------------------------------------------------------

  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    app.log.info(`Received ${signal} — initiating graceful shutdown`);

    // Hard-kill timer: if shutdown takes too long, force exit
    const killTimer = setTimeout(() => {
      app.log.error(
        `Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`
      );
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Ensure the timer doesn't keep the process alive artificially
    if (typeof killTimer.unref === "function") {
      killTimer.unref();
    }

    try {
      // 1. Stop accepting new connections and drain in-flight requests
      await app.close();
      app.log.info("HTTP server closed — all in-flight requests drained");

      // 2. Close BullMQ queues gracefully (flushes pending jobs)
      await Promise.all(ALL_QUEUES.map((q) => q.close()));
      app.log.info("BullMQ queues closed");

      clearTimeout(killTimer);
      app.log.info("Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "Error during graceful shutdown");
      clearTimeout(killTimer);
      process.exit(1);
    }
  };

  // Register signal handlers (once each to avoid duplicate shutdown calls)
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));

  // ----------------------------------------------------------------
  // Start server
  // ----------------------------------------------------------------

  try {
    await app.listen({ port: config.apiPort, host: "0.0.0.0" });
    app.log.info(
      { port: config.apiPort, env: config.nodeEnv },
      "LeaveFlow API server started"
    );
  } catch (err) {
    app.log.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

void main();
