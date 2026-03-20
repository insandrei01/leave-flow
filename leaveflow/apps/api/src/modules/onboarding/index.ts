/**
 * Onboarding module — 6-step new tenant wizard.
 *
 * Steps 1-3 are required. Steps 4-6 are optional (skippable).
 * All step saves are idempotent.
 */

export { onboardingRoutes } from "./onboarding.routes.js";

export { createOnboardingRepository } from "./onboarding.repository.js";
export type { OnboardingRepository } from "./onboarding.repository.js";

export { createOnboardingService } from "./onboarding.service.js";
export type {
  OnboardingService,
  OnboardingServiceDeps,
  TenantService,
  LeaveTypeService,
  WorkflowService,
  TeamService,
  EmployeeService,
  HolidayService,
  TenantSettingsUpdate,
  LeaveTypeCreateInput,
  EmployeeImportResult,
} from "./onboarding.service.js";

export type {
  OnboardingProgress,
  OnboardingStep,
  StepStatus,
  StepData,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
  LeaveTypeInput,
  TeamInput,
  ManualEmployee,
  ImportMethod,
} from "./onboarding.types.js";

export { TOTAL_STEPS, SKIPPABLE_STEPS } from "./onboarding.types.js";
