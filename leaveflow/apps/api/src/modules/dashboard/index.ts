/**
 * Dashboard module — HR aggregate endpoint.
 *
 * Single endpoint returns all 9 widget payloads in parallel for
 * the 3-second load target.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { dashboardRoutes } from "./dashboard.routes.js";

async function registerDashboardPlugin(app: FastifyInstance): Promise<void> {
  await app.register(dashboardRoutes);
}

export const dashboard = fp(registerDashboardPlugin, {
  name: "dashboard-plugin",
  fastify: "5.x",
});

export { createDashboardService } from "./dashboard.service.js";
export type {
  DashboardService,
  DashboardDeps,
  DashboardSummary,
} from "./dashboard.service.js";
