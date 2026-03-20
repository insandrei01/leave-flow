/**
 * Audit service — business logic layer for the append-only audit trail.
 *
 * Key behaviours:
 * - log() is called synchronously by other services after state changes.
 * - Actor names are resolved at READ time, not stored, to support GDPR deletion.
 * - No update or delete operations are exposed.
 */

import type { IAuditLog } from "../../models/audit-log.model.js";
import type { AuditRepository } from "./audit.repository.js";
import type {
  AuditAction,
  AuditEntityType,
  AuditLogFilters,
  EmployeeNameMap,
  PaginatedResult,
  PaginationInput,
} from "./audit.types.js";
import type { AuditActorType } from "../../models/audit-log.model.js";

// ----------------------------------------------------------------
// Input types for the service layer
// ----------------------------------------------------------------

export interface LogAuditParams {
  tenantId: string;
  actorId: string;
  actorRole: string;
  actorType?: AuditActorType;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

// ----------------------------------------------------------------
// Enriched entry type (actor name resolved at read time)
// ----------------------------------------------------------------

export interface EnrichedAuditLog extends IAuditLog {
  actorDisplayName: string;
}

// ----------------------------------------------------------------
// Service dependencies
// ----------------------------------------------------------------

export interface AuditServiceDeps {
  repo: AuditRepository;
}

// ----------------------------------------------------------------
// Service type
// ----------------------------------------------------------------

export interface AuditService {
  log(params: LogAuditParams): Promise<IAuditLog>;
  getAuditLog(
    tenantId: string,
    filters: AuditLogFilters,
    pagination: PaginationInput
  ): Promise<PaginatedResult<EnrichedAuditLog>>;
  getEntityHistory(
    tenantId: string,
    entityType: AuditEntityType,
    entityId: string,
    pagination?: PaginationInput
  ): Promise<PaginatedResult<IAuditLog>>;
  resolveActorNames(
    entries: IAuditLog[],
    employeeMap: EmployeeNameMap
  ): EnrichedAuditLog[];
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createAuditService(deps: AuditServiceDeps): AuditService {
  const { repo } = deps;

  return {
    /**
     * Write a single audit entry. Called synchronously by other services
     * immediately after a state change.
     */
    async log(params: LogAuditParams): Promise<IAuditLog> {
      return repo.insert({
        tenantId: params.tenantId,
        actorId: params.actorId,
        actorType: params.actorType ?? "employee",
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes ?? null,
        metadata: params.metadata
          ? { ...params.metadata, actorRole: params.actorRole }
          : { actorRole: params.actorRole },
      });
    },

    /**
     * Returns a paginated audit log for a tenant with optional filters.
     * Actor names are resolved at read time against the provided employee map.
     */
    async getAuditLog(
      tenantId: string,
      filters: AuditLogFilters,
      pagination: PaginationInput
    ): Promise<PaginatedResult<EnrichedAuditLog>> {
      const result = await repo.findByTenant(tenantId, pagination, filters);

      const enriched = resolveNames(result.items, {});

      return { ...result, items: enriched };
    },

    /**
     * Returns the full change history for one entity (e.g. a leave request).
     */
    async getEntityHistory(
      tenantId: string,
      entityType: AuditEntityType,
      entityId: string,
      pagination: PaginationInput = { page: 1, limit: 50 }
    ): Promise<PaginatedResult<IAuditLog>> {
      return repo.findByEntity(tenantId, entityType, entityId, pagination);
    },

    /**
     * Enriches audit log entries with human-readable actor names.
     *
     * GDPR note: actor IDs are stored in the database, never names. When an
     * employee is deleted the actorId remains in audit entries but their name
     * is no longer in the employeeMap — they are displayed as "[Deleted User]".
     *
     * This function NEVER modifies the original entries (immutable pattern).
     */
    resolveActorNames(
      entries: IAuditLog[],
      employeeMap: EmployeeNameMap
    ): EnrichedAuditLog[] {
      return resolveNames(entries, employeeMap);
    },
  };
}

// ----------------------------------------------------------------
// Private helper (pure function — no side effects)
// ----------------------------------------------------------------

function resolveNames(
  entries: IAuditLog[],
  employeeMap: EmployeeNameMap
): EnrichedAuditLog[] {
  return entries.map((entry) => {
    const actorIdStr = String(entry.actorId);
    const actorDisplayName =
      entry.actorType === "system"
        ? "System"
        : entry.actorType === "bot"
          ? "Bot"
          : (employeeMap[actorIdStr] ?? "[Deleted User]");

    // Return a new object — never mutate the original
    return { ...entry, actorDisplayName } as EnrichedAuditLog;
  });
}
