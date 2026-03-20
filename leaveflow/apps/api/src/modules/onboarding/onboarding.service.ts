/**
 * Onboarding service — manages the 6-step new-tenant wizard.
 *
 * Design rules:
 * - Steps 1-3 are required.
 * - Steps 4-6 are optional (skippable).
 * - Each step save is IDEMPOTENT: re-submitting returns the current state.
 * - The service delegates to other services (tenant, leaveType, etc.) via
 *   injected dependency interfaces.
 */

import type { OnboardingRepository } from "./onboarding.repository.js";
import type {
  OnboardingProgress,
  OnboardingStep,
  StepData,
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
  Step5Data,
  Step6Data,
} from "./onboarding.types.js";
import { TOTAL_STEPS, SKIPPABLE_STEPS } from "./onboarding.types.js";

// ----------------------------------------------------------------
// Dependency interfaces (minimal — just what onboarding needs)
// ----------------------------------------------------------------

export interface TenantSettingsUpdate {
  name?: string;
  country?: string;
  timezone?: string;
  workWeekDays?: number[];
}

export interface TenantService {
  updateSettings(tenantId: string, settings: TenantSettingsUpdate): Promise<void>;
}

export interface LeaveTypeCreateInput {
  name: string;
  slug: string;
  isPaid: boolean;
  requiresApproval: boolean;
  defaultEntitlementDays: number;
}

export interface LeaveTypeService {
  create(tenantId: string, input: LeaveTypeCreateInput): Promise<{ id: string }>;
}

export interface WorkflowService {
  instantiateTemplate(
    tenantId: string,
    templateId: string,
    name: string
  ): Promise<{ id: string }>;
}

export interface TeamService {
  create(
    tenantId: string,
    input: { name: string; managerEmployeeId?: string }
  ): Promise<{ id: string }>;
}

export interface EmployeeImportResult {
  imported: number;
  failed: number;
}

export interface EmployeeService {
  csvImport(tenantId: string, fileKey: string): Promise<EmployeeImportResult>;
  createEmployee(
    tenantId: string,
    input: { email: string; firstName: string; lastName: string; role?: string }
  ): Promise<{ id: string }>;
}

export interface HolidayService {
  setCountryDefaults(tenantId: string, countryCode: string, year: number): Promise<void>;
}

// ----------------------------------------------------------------
// Service dependencies
// ----------------------------------------------------------------

export interface OnboardingServiceDeps {
  repo: OnboardingRepository;
  tenantService: TenantService;
  leaveTypeService: LeaveTypeService;
  workflowService: WorkflowService;
  teamService: TeamService;
  employeeService: EmployeeService;
  holidayService: HolidayService;
}

// ----------------------------------------------------------------
// Service type
// ----------------------------------------------------------------

export interface OnboardingService {
  initialize(tenantId: string): Promise<OnboardingProgress>;
  getProgress(tenantId: string): Promise<OnboardingProgress | null>;
  saveStep(tenantId: string, stepData: StepData): Promise<OnboardingProgress>;
  skipStep(tenantId: string, stepNumber: number): Promise<OnboardingProgress>;
  complete(tenantId: string): Promise<OnboardingProgress>;
  canSkipStep(stepNumber: number): boolean;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createOnboardingService(deps: OnboardingServiceDeps): OnboardingService {
  const {
    repo,
    tenantService,
    leaveTypeService,
    workflowService,
    teamService,
    employeeService,
    holidayService,
  } = deps;

  return {
    /**
     * Create the initial progress record for a tenant — all 6 steps pending.
     * Idempotent: if progress already exists, return it unchanged.
     */
    async initialize(tenantId: string): Promise<OnboardingProgress> {
      const existing = await repo.findByTenant(tenantId);
      if (existing !== null) {
        return existing;
      }

      const steps: OnboardingStep[] = Array.from({ length: TOTAL_STEPS }, (_, i) => ({
        stepNumber: i + 1,
        status: "pending",
        completedAt: null,
        submittedData: null,
      }));

      return repo.upsert(tenantId, {
        tenantId,
        isComplete: false,
        currentStep: 1,
        steps,
      });
    },

    /**
     * Return the current onboarding state (null if not initialised).
     */
    async getProgress(tenantId: string): Promise<OnboardingProgress | null> {
      return repo.findByTenant(tenantId);
    },

    /**
     * Idempotent step save. Re-submitting the same step is safe.
     *
     * The service calls the appropriate downstream service for each step,
     * then marks the step as completed and advances currentStep.
     */
    async saveStep(tenantId: string, stepData: StepData): Promise<OnboardingProgress> {
      const progress = await requireProgress(repo, tenantId);

      const { stepNumber } = stepData;
      const stepIndex = stepNumber - 1;

      // Idempotency: if already completed, return without re-executing
      const existing = progress.steps[stepIndex];
      if (existing?.status === "completed") {
        return progress;
      }

      // Execute downstream effect for this step
      await executeStepEffect(
        tenantId,
        stepData,
        { tenantService, leaveTypeService, workflowService, teamService, employeeService, holidayService }
      );

      // Build updated steps (immutable)
      const now = new Date();
      const updatedSteps = progress.steps.map((step) => {
        if (step.stepNumber !== stepNumber) return step;
        return {
          ...step,
          status: "completed" as const,
          completedAt: now,
          submittedData: stepData.data as Record<string, unknown>,
        };
      });

      const nextStep = computeNextStep(updatedSteps);

      return repo.upsert(tenantId, {
        steps: updatedSteps,
        currentStep: nextStep,
      });
    },

    /**
     * Skip an optional step (4, 5, or 6). Required steps cannot be skipped.
     */
    async skipStep(tenantId: string, stepNumber: number): Promise<OnboardingProgress> {
      if (!SKIPPABLE_STEPS.has(stepNumber)) {
        throw new Error(`Step ${stepNumber} is required and cannot be skipped.`);
      }

      const progress = await requireProgress(repo, tenantId);
      const stepIndex = stepNumber - 1;

      const existing = progress.steps[stepIndex];
      if (existing?.status === "skipped" || existing?.status === "completed") {
        return progress;
      }

      const now = new Date();
      const updatedSteps = progress.steps.map((step) => {
        if (step.stepNumber !== stepNumber) return step;
        return { ...step, status: "skipped" as const, completedAt: now };
      });

      const nextStep = computeNextStep(updatedSteps);

      return repo.upsert(tenantId, { steps: updatedSteps, currentStep: nextStep });
    },

    /**
     * Mark onboarding as complete. Steps 4-6 may be pending or skipped.
     * Steps 1-3 must all be completed.
     */
    async complete(tenantId: string): Promise<OnboardingProgress> {
      const progress = await requireProgress(repo, tenantId);

      // Validate required steps are done
      const requiredSteps = progress.steps.filter((s) => !SKIPPABLE_STEPS.has(s.stepNumber));
      const allRequiredDone = requiredSteps.every((s) => s.status === "completed");

      if (!allRequiredDone) {
        const pending = requiredSteps
          .filter((s) => s.status !== "completed")
          .map((s) => s.stepNumber)
          .join(", ");
        throw new Error(`Cannot complete onboarding. Required steps not done: ${pending}`);
      }

      return repo.upsert(tenantId, { isComplete: true });
    },

    /**
     * Returns true for optional steps (4, 5, 6).
     */
    canSkipStep(stepNumber: number): boolean {
      return SKIPPABLE_STEPS.has(stepNumber);
    },
  };
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

async function requireProgress(
  repo: OnboardingRepository,
  tenantId: string
): Promise<OnboardingProgress> {
  const progress = await repo.findByTenant(tenantId);
  if (progress === null) {
    throw new Error(
      `Onboarding not initialised for tenant ${tenantId}. Call initialize() first.`
    );
  }
  return progress;
}

/** Find the first step that is not yet completed/skipped, or return TOTAL_STEPS + 1. */
function computeNextStep(steps: OnboardingStep[]): number {
  const next = steps.find(
    (s) => s.status !== "completed" && s.status !== "skipped"
  );
  return next?.stepNumber ?? TOTAL_STEPS + 1;
}

type StepEffectDeps = Pick<
  OnboardingServiceDeps,
  | "tenantService"
  | "leaveTypeService"
  | "workflowService"
  | "teamService"
  | "employeeService"
  | "holidayService"
>;

async function executeStepEffect(
  tenantId: string,
  stepData: StepData,
  deps: StepEffectDeps
): Promise<void> {
  switch (stepData.stepNumber) {
    case 1:
      await executeStep1(tenantId, stepData.data, deps.tenantService);
      break;
    case 2:
      await executeStep2(tenantId, stepData.data, deps.leaveTypeService);
      break;
    case 3:
      await executeStep3(tenantId, stepData.data, deps.workflowService);
      break;
    case 4:
      await executeStep4(tenantId, stepData.data, deps.teamService);
      break;
    case 5:
      await executeStep5(tenantId, stepData.data, deps.employeeService);
      break;
    case 6:
      await executeStep6(tenantId, stepData.data, deps.holidayService);
      break;
  }
}

async function executeStep1(
  tenantId: string,
  data: Step1Data,
  tenantService: TenantService
): Promise<void> {
  await tenantService.updateSettings(tenantId, {
    name: data.companyName,
    country: data.country,
    timezone: data.timezone,
    workWeekDays: data.workWeekDays,
  });
}

async function executeStep2(
  tenantId: string,
  data: Step2Data,
  leaveTypeService: LeaveTypeService
): Promise<void> {
  await Promise.all(
    data.leaveTypes.map((lt) =>
      leaveTypeService.create(tenantId, {
        name: lt.name,
        slug: lt.slug,
        isPaid: lt.isPaid,
        requiresApproval: lt.requiresApproval,
        defaultEntitlementDays: lt.defaultEntitlementDays,
      })
    )
  );
}

async function executeStep3(
  tenantId: string,
  data: Step3Data,
  workflowService: WorkflowService
): Promise<void> {
  await workflowService.instantiateTemplate(tenantId, data.templateId, data.workflowName);
}

async function executeStep4(
  tenantId: string,
  data: Step4Data,
  teamService: TeamService
): Promise<void> {
  await Promise.all(
    data.teams.map((team) =>
      teamService.create(tenantId, {
        name: team.name,
        managerEmployeeId: team.managerEmployeeId,
      })
    )
  );
}

async function executeStep5(
  tenantId: string,
  data: Step5Data,
  employeeService: EmployeeService
): Promise<void> {
  if (data.importMethod === "csv" && data.fileKey !== undefined) {
    await employeeService.csvImport(tenantId, data.fileKey);
    return;
  }

  if (data.importMethod === "manual" && data.employees !== undefined) {
    await Promise.all(
      data.employees.map((emp) =>
        employeeService.createEmployee(tenantId, {
          email: emp.email,
          firstName: emp.firstName,
          lastName: emp.lastName,
          role: emp.role,
        })
      )
    );
  }
}

async function executeStep6(
  tenantId: string,
  data: Step6Data,
  holidayService: HolidayService
): Promise<void> {
  await holidayService.setCountryDefaults(tenantId, data.countryCode, data.year);
}
