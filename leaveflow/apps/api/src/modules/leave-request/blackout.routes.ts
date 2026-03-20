/**
 * Blackout period routes.
 *
 * POST   /blackout-periods        — create (hr_admin+)
 * GET    /blackout-periods        — list all active periods (all auth)
 * DELETE /blackout-periods/:id    — delete (hr_admin+)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { BlackoutService } from "./blackout.service.js";
import { sendSuccess, sendCreated, sendNoContent } from "../../lib/response.js";
import {
  ForbiddenError,
  ValidationError,
} from "../../lib/errors.js";

// ----------------------------------------------------------------
// Schemas
// ----------------------------------------------------------------

const MONGO_ID_RE = /^[0-9a-fA-F]{24}$/;

const createBlackoutBodySchema = z.object({
  name: z.string().min(1).max(200),
  startDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "startDate must be a valid ISO date string",
  }),
  endDate: z.string().refine((s) => !isNaN(Date.parse(s)), {
    message: "endDate must be a valid ISO date string",
  }),
  teamIds: z.array(z.string()).nullable().optional(),
  leaveTypeIds: z.array(z.string()).nullable().optional(),
  reason: z.string().max(500).nullable().optional(),
});

const blackoutParamsSchema = z.object({
  id: z.string().regex(MONGO_ID_RE, "id must be a valid MongoDB ObjectId"),
});

// ----------------------------------------------------------------
// Authorization
// ----------------------------------------------------------------

const HR_PLUS_ROLES = new Set(["company_admin", "hr_admin"]);

function assertHrPlus(request: FastifyRequest): void {
  const role = request.auth?.role ?? "";
  if (!HR_PLUS_ROLES.has(role)) {
    throw new ForbiddenError("Only hr_admin or company_admin can manage blackout periods");
  }
}

// ----------------------------------------------------------------
// Route factory
// ----------------------------------------------------------------

export function createBlackoutRoutes(service: BlackoutService) {
  return async function blackoutRoutes(app: FastifyInstance): Promise<void> {
    // POST /blackout-periods
    app.post(
      "/blackout-periods",
      async (request: FastifyRequest, reply: FastifyReply) => {
        assertHrPlus(request);
        const tenantId = request.auth!.tenantId;

        const parsed = createBlackoutBodySchema.safeParse(request.body);
        if (!parsed.success) {
          throw new ValidationError(
            "Invalid request body",
            parsed.error.issues
          );
        }

        const bp = await service.createBlackoutPeriod(tenantId, {
          name: parsed.data.name,
          startDate: new Date(parsed.data.startDate),
          endDate: new Date(parsed.data.endDate),
          teamIds: parsed.data.teamIds ?? null,
          leaveTypeIds: parsed.data.leaveTypeIds ?? null,
          reason: parsed.data.reason ?? null,
        });

        return sendCreated(reply, bp);
      }
    );

    // GET /blackout-periods
    app.get(
      "/blackout-periods",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const tenantId = request.auth!.tenantId;
        const periods = await service.listBlackoutPeriods(tenantId);
        return sendSuccess(reply, periods);
      }
    );

    // DELETE /blackout-periods/:id
    app.delete(
      "/blackout-periods/:id",
      async (
        request: FastifyRequest<{ Params: { id: string } }>,
        reply: FastifyReply
      ) => {
        assertHrPlus(request);
        const tenantId = request.auth!.tenantId;

        const params = blackoutParamsSchema.safeParse(request.params);
        if (!params.success) {
          throw new ValidationError("Invalid params", params.error.issues);
        }

        await service.deleteBlackoutPeriod(tenantId, params.data.id);
        return sendNoContent(reply);
      }
    );
  };
}
