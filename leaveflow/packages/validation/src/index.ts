/**
 * @leaveflow/validation — barrel export for all Zod schemas and inferred types.
 */

export {
  registerBodySchema,
  loginBodySchema,
} from './auth.schema.js';
export type { RegisterBody, LoginBody } from './auth.schema.js';

export {
  updateTenantBodySchema,
  tenantSettingsBodySchema,
} from './tenant.schema.js';
export type { UpdateTenantBody, TenantSettingsBody } from './tenant.schema.js';

export {
  createEmployeeBodySchema,
  updateEmployeeBodySchema,
  csvImportBodySchema,
} from './employee.schema.js';
export type {
  CreateEmployeeBody,
  UpdateEmployeeBody,
  CsvImportBody,
} from './employee.schema.js';

export {
  createTeamBodySchema,
  updateTeamBodySchema,
} from './team.schema.js';
export type { CreateTeamBody, UpdateTeamBody } from './team.schema.js';

export {
  workflowStepSchema,
  createWorkflowBodySchema,
  updateWorkflowBodySchema,
} from './workflow.schema.js';
export type {
  WorkflowStep,
  CreateWorkflowBody,
  UpdateWorkflowBody,
} from './workflow.schema.js';

export {
  createLeaveTypeBodySchema,
  updateLeaveTypeBodySchema,
} from './leave-type.schema.js';
export type {
  CreateLeaveTypeBody,
  UpdateLeaveTypeBody,
} from './leave-type.schema.js';

export {
  createLeaveRequestBodySchema,
  validateLeaveRequestBodySchema,
  cancelLeaveRequestBodySchema,
} from './leave-request.schema.js';
export type {
  CreateLeaveRequestBody,
  ValidateLeaveRequestBody,
  CancelLeaveRequestBody,
} from './leave-request.schema.js';

export {
  approveBodySchema,
  rejectBodySchema,
  forceApproveBodySchema,
} from './approval.schema.js';
export type {
  ApproveBody,
  RejectBody,
  ForceApproveBody,
} from './approval.schema.js';

export {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep4Schema,
  onboardingStep5Schema,
  onboardingStep6Schema,
} from './onboarding.schema.js';
export type {
  OnboardingStep1Body,
  OnboardingStep2Body,
  OnboardingStep3Body,
  OnboardingStep4Body,
  OnboardingStep5Body,
  OnboardingStep6Body,
} from './onboarding.schema.js';

export {
  paginationQuerySchema,
  dateRangeQuerySchema,
} from './pagination.schema.js';
export type { PaginationQuery, DateRangeQuery } from './pagination.schema.js';

export { manualAdjustmentBodySchema } from './balance.schema.js';
export type { ManualAdjustmentBody } from './balance.schema.js';
