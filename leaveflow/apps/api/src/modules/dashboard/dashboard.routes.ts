/**
 * Dashboard routes — hr_admin / company_admin only.
 *
 * GET /dashboard/summary — returns all 9 widget payloads in a single response.
 *
 * Cache strategy:
 *   1. Attempt to read from Redis cache (key: dashboard:summary:{tenantId})
 *   2. On cache hit  → return cached payload immediately
 *   3. On cache miss → call service.getSummary(), return live result
 *      (background worker will populate cache on next run)
 */

import type { FastifyInstance } from "fastify";
import {
  LeaveRequestModel,
  EmployeeModel,
  BalanceLedgerModel,
  AuditLogModel,
  TeamModel,
} from "../../models/index.js";
import { createDashboardService } from "./dashboard.service.js";
import type { DashboardDeps, DashboardSummary } from "./dashboard.service.js";
import { readDashboardCache } from "../../workers/dashboard-cache.worker.js";
import type { IRedisClientDep } from "../../workers/dashboard-cache.worker.js";
import { sendSuccess } from "../../lib/response.js";
import { ForbiddenError } from "../../lib/errors.js";
import { getRedisClient } from "../../lib/redis.js";

const ALLOWED_ROLES = new Set(["hr_admin", "company_admin"]);

export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  const deps: DashboardDeps = {
    leaveRequestModel: LeaveRequestModel as unknown as DashboardDeps["leaveRequestModel"],
    employeeModel: EmployeeModel as unknown as DashboardDeps["employeeModel"],
    balanceLedgerModel: BalanceLedgerModel as unknown as DashboardDeps["balanceLedgerModel"],
    auditLogModel: AuditLogModel as unknown as DashboardDeps["auditLogModel"],
    teamModel: TeamModel as unknown as DashboardDeps["teamModel"],
  };
  const service = createDashboardService(deps);
  const redisClient = getRedisClient() as unknown as IRedisClientDep;

  /**
   * GET /dashboard/summary
   * Returns all 9 bento widget payloads in a single call.
   * Auth: hr_admin, company_admin
   */
  app.get(
    "/dashboard/summary",
    async (request, reply) => {
      const role = request.auth?.role ?? "";
      if (!ALLOWED_ROLES.has(role)) {
        throw new ForbiddenError("Only hr_admin or company_admin can access the dashboard summary");
      }

      const tenantId = request.tenantId ?? "";

      // Attempt cache read first
      const cached = await readDashboardCache<DashboardSummary>(tenantId, redisClient);
      if (cached !== null) {
        return sendSuccess(reply, {
          generatedAt: cached.generatedAt instanceof Date
            ? cached.generatedAt.toISOString()
            : String(cached.generatedAt),
          widgets: cached.widgets,
        });
      }

      // Cache miss — compute live
      const summary = await service.getSummary(tenantId);

      return sendSuccess(reply, {
        generatedAt: summary.generatedAt.toISOString(),
        widgets: summary.widgets,
      });
    }
  );
}
