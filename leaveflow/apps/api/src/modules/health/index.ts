import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { healthRoutes } from "./health.routes.js";

/**
 * Fastify plugin that registers all health-related routes.
 */
async function registerHealthPlugin(app: FastifyInstance): Promise<void> {
  await app.register(healthRoutes);
}

export const health = fp(registerHealthPlugin, {
  name: "health-plugin",
  fastify: "5.x",
});
