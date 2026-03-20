import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

function isPublicRoute(request: FastifyRequest): boolean {
  return request.routeOptions?.config?.["public"] === true;
}

function sendForbidden(reply: FastifyReply, message: string): void {
  void reply.code(403).send({
    success: false,
    data: null,
    error: { code: "FORBIDDEN", message, details: null },
  });
}

/**
 * Tenant plugin — runs as a preHandler hook after authPlugin.
 *
 * Reads `request.auth.tenantId` and copies it to `request.tenantId`
 * as a convenience shortcut for route handlers.
 *
 * If tenantId is absent on a non-public route → 403.
 */
async function registerTenantPlugin(app: FastifyInstance): Promise<void> {
  app.addHook(
    "preHandler",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (isPublicRoute(request)) {
        return;
      }

      const tenantId = request.auth?.tenantId;

      if (tenantId === undefined) {
        sendForbidden(reply, "Tenant context is required");
        return;
      }

      request.tenantId = tenantId;
    }
  );
}

export const tenantPlugin = fp(registerTenantPlugin, {
  name: "tenant-plugin",
  fastify: "5.x",
});
