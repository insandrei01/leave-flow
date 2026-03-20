/**
 * @leaveflow/shared-types — barrel export for all TypeScript interfaces and type unions.
 */

export type {
  Plan,
  PlanLimits,
  TenantSettings,
  OnboardingState,
  SlackInstallation,
  TeamsInstallation,
  Tenant,
} from './tenant.types.js';

export type {
  EmployeeRole,
  EmployeeStatus,
  InvitationStatus,
  PrimaryPlatform,
  Employee,
} from './employee.types.js';

export type { Team } from './team.types.js';

export type {
  ApproverType,
  TimeoutAction,
  WorkflowStep,
  AutoApprovalRule,
  Workflow,
} from './workflow.types.js';

export type {
  AccrualType,
  CustomScheduleEntry,
  AccrualRule,
  CarryoverRule,
  LeaveType,
} from './leave-type.types.js';

export type {
  LeaveRequestStatus,
  ApprovalAction,
  ApprovalVia,
  ApprovalHistoryEntry,
  WorkflowSnapshot,
  CalendarEventIds,
  LeaveRequest,
} from './leave-request.types.js';

export type {
  LedgerEntryType,
  LedgerReferenceType,
  BalanceLedgerEntry,
  MonthlyUsageEntry,
  AccrualScheduleSummary,
  BalanceSummary,
} from './balance.types.js';

export type {
  AuditActorType,
  AuditAction,
  AuditEntityType,
  AuditLogEntry,
} from './audit.types.js';

export type { BotPlatform, BotMapping } from './bot.types.js';

export type {
  HolidayCalendarSource,
  Holiday,
  HolidayCalendar,
} from './holiday.types.js';

export type { Delegation } from './delegation.types.js';

export type {
  NotificationEventType,
  NotificationChannel,
  NotificationStatus,
  NotificationReferenceType,
  Notification,
} from './notification.types.js';

export type { BlackoutPeriod } from './blackout.types.js';

export type {
  SortOrder,
  ValidationErrorDetail,
  ApiError,
  PaginationMeta,
  ApiEnvelope,
  PaginatedResponse,
  ErrorResponse,
} from './api.types.js';
