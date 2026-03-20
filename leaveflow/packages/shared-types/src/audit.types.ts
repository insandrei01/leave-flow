/**
 * Audit log types — immutable insert-only audit trail.
 * No update or delete permitted (BR-100).
 */

export type AuditActorType = 'employee' | 'system' | 'bot';

/**
 * Standardized action vocabulary across all entity types.
 */
export type AuditAction =
  // leave_request
  | 'created'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'cancelled'
  | 'force_approved'
  | 'force_rejected'
  // employee
  | 'invited'
  | 'activated'
  | 'deactivated'
  | 'role_changed'
  | 'team_changed'
  | 'pseudonymized'
  // team
  | 'updated'
  | 'workflow_assigned'
  // workflow
  | 'cloned'
  // tenant
  | 'settings_updated'
  | 'plan_changed'
  | 'slack_installed'
  | 'teams_installed'
  // balance
  | 'manual_adjustment'
  | 'accrual_batch'
  | 'carryover_batch'
  | 'year_end_forfeit_batch'
  // delegation
  | 'revoked'
  | 'expired'
  // policy
  | 'blackout_created'
  | 'blackout_updated'
  | 'blackout_deleted';

export type AuditEntityType =
  | 'leave_request'
  | 'employee'
  | 'team'
  | 'workflow'
  | 'leave_type'
  | 'tenant'
  | 'balance'
  | 'delegation'
  | 'policy';

export interface AuditLogEntry {
  readonly _id: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly actorType: AuditActorType;
  readonly action: AuditAction;
  readonly entityType: AuditEntityType;
  readonly entityId: string;
  readonly changes: Record<string, unknown> | null;
  readonly metadata: Record<string, unknown> | null;
  readonly timestamp: string;
}
