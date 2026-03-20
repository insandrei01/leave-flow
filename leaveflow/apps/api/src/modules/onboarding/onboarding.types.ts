/**
 * Types for the Onboarding module.
 *
 * The 6-step wizard guides a new tenant through initial setup.
 * Steps 4-6 are optional (skippable).
 * Each step save is idempotent — re-submitting the same step is safe.
 */

// ----------------------------------------------------------------
// Step status
// ----------------------------------------------------------------

export type StepStatus = "pending" | "completed" | "skipped";

// ----------------------------------------------------------------
// Per-step data types
// ----------------------------------------------------------------

/** Step 1 — Company basics */
export interface Step1Data {
  companyName: string;
  country: string;
  timezone: string;
  workWeekDays: number[]; // e.g. [1, 2, 3, 4, 5] = Mon-Fri
}

/** Step 2 — Leave types */
export interface LeaveTypeInput {
  name: string;
  slug: string;
  isPaid: boolean;
  requiresApproval: boolean;
  defaultEntitlementDays: number;
}

export interface Step2Data {
  leaveTypes: LeaveTypeInput[];
}

/** Step 3 — Approval workflow template */
export interface Step3Data {
  templateId: string;
  workflowName: string;
}

/** Step 4 — Teams (optional) */
export interface TeamInput {
  name: string;
  managerEmployeeId?: string;
}

export interface Step4Data {
  teams: TeamInput[];
}

/** Step 5 — Employee import (optional) */
export type ImportMethod = "csv" | "manual";

export interface ManualEmployee {
  email: string;
  firstName: string;
  lastName: string;
  role?: string;
}

export interface Step5Data {
  importMethod: ImportMethod;
  /** Present when importMethod = "csv" */
  fileKey?: string;
  /** Present when importMethod = "manual" */
  employees?: ManualEmployee[];
}

/** Step 6 — Holidays (optional) */
export interface Step6Data {
  countryCode: string;
  year: number;
}

/** Discriminated union for step data */
export type StepData =
  | { stepNumber: 1; data: Step1Data }
  | { stepNumber: 2; data: Step2Data }
  | { stepNumber: 3; data: Step3Data }
  | { stepNumber: 4; data: Step4Data }
  | { stepNumber: 5; data: Step5Data }
  | { stepNumber: 6; data: Step6Data };

// ----------------------------------------------------------------
// Progress record
// ----------------------------------------------------------------

export interface OnboardingStep {
  stepNumber: number;
  status: StepStatus;
  completedAt: Date | null;
  /** The data submitted for this step (stored for resume support). */
  submittedData: Record<string, unknown> | null;
}

export interface OnboardingProgress {
  tenantId: string;
  isComplete: boolean;
  currentStep: number;
  steps: OnboardingStep[];
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

export const TOTAL_STEPS = 6;
export const SKIPPABLE_STEPS: ReadonlySet<number> = new Set([4, 5, 6]);
