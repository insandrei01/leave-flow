/**
 * Audit repository — insert-only data access for the audit_logs collection.
 *
 * Design constraints (BR-100):
 * - NO update or delete methods — audit log is immutable by design.
 * - tenantId is the first parameter on every query method.
 */

import { AuditLogModel, type IAuditLog } from "../../models/audit-log.model.js";
import type {
  CreateAuditEntryInput,
  AuditLogFilters,
  PaginationInput,
  PaginatedResult,
} from "./audit.types.js";

// ----------------------------------------------------------------
// Repository type
// ----------------------------------------------------------------

export interface AuditRepository {
  insert(entry: CreateAuditEntryInput): Promise<IAuditLog>;
  findByTenant(
    tenantId: string,
    pagination: PaginationInput,
    filters?: AuditLogFilters
  ): Promise<PaginatedResult<IAuditLog>>;
  findByEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    pagination: PaginationInput
  ): Promise<PaginatedResult<IAuditLog>>;
  findByActor(
    tenantId: string,
    actorId: string,
    pagination: PaginationInput
  ): Promise<PaginatedResult<IAuditLog>>;
  getActivityFeed(tenantId: string, limit: number): Promise<IAuditLog[]>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createAuditRepository(): AuditRepository {
  return {
    /**
     * Insert a new audit log entry. This is the only write operation.
     */
    async insert(entry: CreateAuditEntryInput): Promise<IAuditLog> {
      const doc = new AuditLogModel({
        tenantId: entry.tenantId,
        actorId: entry.actorId,
        actorType: entry.actorType,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        changes: entry.changes ?? null,
        metadata: entry.metadata ?? null,
        timestamp: new Date(),
      });

      return doc.save();
    },

    /**
     * Returns a paginated, chronological audit trail for a tenant.
     * Supports optional date range and action filtering.
     */
    async findByTenant(
      tenantId: string,
      pagination: PaginationInput,
      filters: AuditLogFilters = {}
    ): Promise<PaginatedResult<IAuditLog>> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const query: Record<string, unknown> = { tenantId };

      if (filters.dateFrom !== undefined || filters.dateTo !== undefined) {
        const range: Record<string, Date> = {};
        if (filters.dateFrom !== undefined) range["$gte"] = filters.dateFrom;
        if (filters.dateTo !== undefined) range["$lte"] = filters.dateTo;
        query["timestamp"] = range;
      }

      if (filters.action !== undefined) {
        query["action"] = filters.action;
      }

      if (filters.actorId !== undefined) {
        query["actorId"] = filters.actorId;
      }

      if (filters.entityType !== undefined) {
        query["entityType"] = filters.entityType;
      }

      if (filters.entityId !== undefined) {
        query["entityId"] = filters.entityId;
      }

      const [items, total] = await Promise.all([
        AuditLogModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean<IAuditLog[]>(),
        AuditLogModel.countDocuments(query),
      ]);

      return { items, total, page, limit };
    },

    /**
     * Returns the full audit history for a specific entity (e.g. a leave request).
     */
    async findByEntity(
      tenantId: string,
      entityType: string,
      entityId: string,
      pagination: PaginationInput
    ): Promise<PaginatedResult<IAuditLog>> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const query = { tenantId, entityType, entityId };

      const [items, total] = await Promise.all([
        AuditLogModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean<IAuditLog[]>(),
        AuditLogModel.countDocuments(query),
      ]);

      return { items, total, page, limit };
    },

    /**
     * Returns a paginated list of actions performed by a specific actor.
     */
    async findByActor(
      tenantId: string,
      actorId: string,
      pagination: PaginationInput
    ): Promise<PaginatedResult<IAuditLog>> {
      const { page, limit } = pagination;
      const skip = (page - 1) * limit;

      const query = { tenantId, actorId };

      const [items, total] = await Promise.all([
        AuditLogModel.find(query)
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean<IAuditLog[]>(),
        AuditLogModel.countDocuments(query),
      ]);

      return { items, total, page, limit };
    },

    /**
     * Returns the most recent N events for a tenant — used by the dashboard
     * activity feed widget.
     */
    async getActivityFeed(tenantId: string, limit: number): Promise<IAuditLog[]> {
      return AuditLogModel.find({ tenantId })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean<IAuditLog[]>();
    },
  };
}
