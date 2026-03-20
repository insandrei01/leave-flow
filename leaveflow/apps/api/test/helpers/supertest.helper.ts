import type { FastifyInstance } from "fastify";
import { buildApp } from "../../src/app.js";

/**
 * Creates a Fastify app instance wired for testing.
 * Each test suite should call this once and close it in afterAll.
 */
export async function createTestApp(): Promise<FastifyInstance> {
  const app = await buildApp({ logger: false });
  await app.ready();
  return app;
}
