/**
 * Auth routes.
 *
 * POST /auth/register — public, creates tenant + employee + Firebase user
 * GET  /auth/me       — authenticated, returns current employee profile
 */

import type {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { registerBodySchema } from "./auth.schema.js";
import { sendCreated, sendSuccess } from "../../lib/response.js";
import type { AuthService } from "./auth.service.js";
import type { RegisterBody } from "./auth.schema.js";

// ----------------------------------------------------------------
// Handler factories
// ----------------------------------------------------------------

function makeRegisterHandler(authService: AuthService) {
  return async function registerHandler(
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const body = registerBodySchema.parse(request.body);
    const result = await authService.register(body);
    sendCreated(reply, result);
  };
}

function makeMeHandler(authService: AuthService) {
  return async function meHandler(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void> {
    const { uid, tenantId, employeeId } = request.auth!;
    const result = await authService.getMe(uid, tenantId, employeeId);
    sendSuccess(reply, result);
  };
}

// ----------------------------------------------------------------
// Route plugin
// ----------------------------------------------------------------

export async function authRoutes(
  fastify: FastifyInstance,
  opts: { authService: AuthService }
): Promise<void> {
  const { authService } = opts;

  fastify.post(
    "/auth/register",
    {
      config: { public: true },
    },
    makeRegisterHandler(authService)
  );

  fastify.get("/auth/me", {}, makeMeHandler(authService));
}
