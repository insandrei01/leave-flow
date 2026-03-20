/**
 * Types for the Audit Trail module.
 *
 * The audit log is append-only (insert-only). There are no update or delete
 * operations at the service or repository level.
 */

import type { AuditActorType } from "../../models/audit-log.model.js";

// ----------------------------------------------------------------
// String union types
// ----------------------------------------------------------------

export type AuditAction =
  | "leave_request.submitted"
  | "leave_request.approved"
  | "leave_request.rejected"
  | "leave_request.cancelled"
  | "leave_request.escalated"
  | "leave_request.withdrawn"
  | "employee.created"
  | "employee.updated"
  | "employee.deactivated"
  | "employee.deleted"
  | "employee.role_changed"
  | "team.created"
  | "team.updated"
  | "team.deleted"
  | "workflow.created"
  | "workflow.updated"
  | "workflow.deleted"
  | "leave_type.created"
  | "leave_type.updated"
  | "leave_type.deleted"
  | "tenant.settings_updated"
  | "onboarding.step_completed"
  | "onboarding.completed"
  | "delegation.created"
  | "delegation.revoked"
  | "balance.adjusted"
  | "system.import_completed";

export type AuditEntityType =
  | "leave_request"
  | "employee"
  | "team"
  | "workflow"
  | "leave_type"
  | "tenant"
  | "onboarding"
  | "delegation"
  | "balance_ledger";

// ----------------------------------------------------------------
// Input / filter types
// ----------------------------------------------------------------

export interface CreateAuditEntryInput {
  tenantId: string;
  actorId: string;
  actorType: AuditActorType;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  changes?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface AuditLogFilters {
  dateFrom?: Date;
  dateTo?: Date;
  action?: AuditAction;
  actorId?: string;
  entityType?: AuditEntityType;
  entityId?: string;
}

export interface PaginationInput {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ----------------------------------------------------------------
// Actor resolution types (GDPR — resolve at read time, not stored)
// ----------------------------------------------------------------

export interface ActorInfo {
  id: string;
  displayName: string;
  isDeleted: boolean;
}

/** Map from actorId string to display name (or "[Deleted User]" if absent). */
export type EmployeeNameMap = Record<string, string>;
