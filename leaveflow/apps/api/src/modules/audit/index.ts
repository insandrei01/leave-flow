/**
 * Audit module — append-only audit trail.
 *
 * The audit log is immutable: once an entry is written it cannot be
 * updated or deleted. Actor names are resolved at read time to support
 * GDPR pseudonymization without modifying stored entries.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { auditRoutes } from "./audit.routes.js";

async function registerAuditPlugin(app: FastifyInstance): Promise<void> {
  await app.register(auditRoutes);
}

export const audit = fp(registerAuditPlugin, {
  name: "audit-plugin",
  fastify: "5.x",
});

export { createAuditRepository } from "./audit.repository.js";
export type { AuditRepository } from "./audit.repository.js";

export { createAuditService } from "./audit.service.js";
export type { AuditService, AuditServiceDeps, LogAuditParams, EnrichedAuditLog } from "./audit.service.js";

export type {
  AuditAction,
  AuditEntityType,
  CreateAuditEntryInput,
  AuditLogFilters,
  PaginationInput,
  PaginatedResult,
  EmployeeNameMap,
  ActorInfo,
} from "./audit.types.js";
