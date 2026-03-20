import "fastify";

/**
 * Auth payload extracted from a verified Firebase ID token.
 * Attached to every authenticated request by auth.plugin.ts.
 */
export interface AuthPayload {
  readonly uid: string;
  readonly tenantId: string;
  readonly employeeId: string;
  readonly role: string;
}

declare module "fastify" {
  interface FastifyRequest {
    /**
     * Populated by authPlugin after successful token verification.
     * Undefined on public routes and bot webhook routes.
     */
    auth: AuthPayload | undefined;

    /**
     * Convenience shortcut to request.auth.tenantId.
     * Populated by tenantPlugin after authPlugin runs.
     * Undefined on public routes.
     */
    tenantId: string | undefined;
  }

  interface FastifyContextConfig {
    /**
     * When true the route is exempt from Firebase auth and tenant checks.
     * Example: { config: { public: true } }
     */
    public?: boolean;
  }
}
