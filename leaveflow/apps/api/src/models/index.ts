/**
 * Barrel export for all 14 LeaveFlow Mongoose models.
 *
 * Import order matters for Mongoose model registration — models that are
 * referenced by other models should be registered first.
 */

// Root entity (no tenantId dependency)
export { TenantModel } from "./tenant.model.js";
export type { ITenant, TenantSettings, TenantPlanLimits } from "./tenant.model.js";

// Core entities
export { EmployeeModel } from "./employee.model.js";
export type {
  IEmployee,
  EmployeeRole,
  InvitationStatus,
  EmployeeStatus,
  PrimaryPlatform,
} from "./employee.model.js";

export { TeamModel } from "./team.model.js";
export type { ITeam } from "./team.model.js";

export { WorkflowModel } from "./workflow.model.js";
export type {
  IWorkflow,
  WorkflowStep,
  AutoApprovalRule,
  ApproverType,
  EscalationAction,
} from "./workflow.model.js";

export { LeaveTypeModel } from "./leave-type.model.js";
export type {
  ILeaveType,
  AccrualRule,
  CarryoverRule,
  AccrualType,
} from "./leave-type.model.js";

// Transactional entities
export { LeaveRequestModel } from "./leave-request.model.js";
export type {
  ILeaveRequest,
  LeaveRequestStatus,
  ApprovalHistoryEntry,
  WorkflowSnapshot,
  ApprovalActionType,
  ApprovalChannel,
} from "./leave-request.model.js";

// Append-only / immutable collections
export { BalanceLedgerModel } from "./balance-ledger.model.js";
export type {
  IBalanceLedger,
  LedgerEntryType,
  LedgerReferenceType,
} from "./balance-ledger.model.js";

export { AuditLogModel } from "./audit-log.model.js";
export type { IAuditLog, AuditActorType } from "./audit-log.model.js";

// Supporting entities
export { BotMappingModel } from "./bot-mapping.model.js";
export type { IBotMapping, BotPlatform } from "./bot-mapping.model.js";

export { HolidayCalendarModel } from "./holiday-calendar.model.js";
export type { IHolidayCalendar, Holiday } from "./holiday-calendar.model.js";

export { DelegationModel } from "./delegation.model.js";
export type { IDelegation } from "./delegation.model.js";

export { OAuthTokenModel } from "./oauth-token.model.js";
export type { IOAuthToken, OAuthService } from "./oauth-token.model.js";

export { BlackoutPeriodModel } from "./blackout-period.model.js";
export type { IBlackoutPeriod } from "./blackout-period.model.js";

export { NotificationModel } from "./notification.model.js";
export type {
  INotification,
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
} from "./notification.model.js";
