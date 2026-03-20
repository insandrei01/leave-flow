import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { verifyIdToken } from "../lib/firebase-admin.js";
import type { AuthPayload } from "../types/fastify.js";

const BOT_WEBHOOK_PREFIXES = ["/slack/", "/teams/"] as const;

function isBotWebhookRoute(url: string): boolean {
  return BOT_WEBHOOK_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function isPublicRoute(request: FastifyRequest): boolean {
  return request.routeOptions?.config?.["public"] === true;
}

function extractBearerToken(
  authHeader: string | undefined
): string | undefined {
  if (authHeader === undefined) {
    return undefined;
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== "bearer") {
    return undefined;
  }
  return parts[1];
}

function sendUnauthorized(reply: FastifyReply, message: string): void {
  void reply.code(401).send({
    success: false,
    data: null,
    error: { code: "UNAUTHORIZED", message, details: null },
  });
}

/**
 * Authentication plugin — runs as an onRequest hook on every route.
 *
 * Skipped for:
 *   - Routes with `{ config: { public: true } }`
 *   - Bot webhook paths (starting with /slack/ or /teams/)
 *
 * On success: attaches `request.auth` with uid, tenantId, employeeId, role.
 * On failure: returns 401 with standard error envelope.
 */
async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  app.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (isPublicRoute(request)) {
        return;
      }

      if (isBotWebhookRoute(request.url)) {
        return;
      }

      const token = extractBearerToken(request.headers["authorization"]);

      if (token === undefined) {
        sendUnauthorized(
          reply,
          "Authorization header with Bearer token is required"
        );
        return;
      }

      let claims: Awaited<ReturnType<typeof verifyIdToken>>;

      try {
        claims = await verifyIdToken(token);
      } catch (_err) {
        sendUnauthorized(reply, "Invalid or expired token");
        return;
      }

      if (
        claims.tenantId === undefined ||
        claims.employeeId === undefined ||
        claims.role === undefined
      ) {
        sendUnauthorized(
          reply,
          "Token is missing required claims: tenantId, employeeId, role"
        );
        return;
      }

      const auth: AuthPayload = Object.freeze({
        uid: claims.uid,
        tenantId: claims.tenantId,
        employeeId: claims.employeeId,
        role: claims.role,
      });

      request.auth = auth;
    }
  );
}

export const authPlugin = fp(registerAuthPlugin, {
  name: "auth-plugin",
  fastify: "5.x",
});
