/**
 * Tenant entity types — represents a company workspace in the multi-tenant system.
 */

export type Plan = 'free' | 'team' | 'business' | 'enterprise';

export interface PlanLimits {
  readonly maxEmployees: number;
  readonly maxWorkflowSteps: number;
  readonly maxLeaveTypes: number;
  readonly maxPlatforms: number;
}

export interface TenantSettings {
  readonly timezone: string;
  readonly fiscalYearStartMonth: number;
  readonly workWeek: readonly number[];
  readonly coverageMinimumPercent: number;
  readonly announcementChannelEnabled: boolean;
  readonly locale: string;
}

export interface OnboardingState {
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
  readonly startedAt: string;
}

export interface SlackInstallation {
  readonly teamId: string;
  readonly botToken: string;
  readonly botUserId: string;
  readonly installedAt: string;
  readonly installedBy: string;
}

export interface TeamsInstallation {
  readonly tenantId: string;
  readonly botId: string;
  readonly serviceUrl: string;
  readonly installedAt: string;
  readonly installedBy: string;
}

export interface Tenant {
  readonly _id: string;
  readonly name: string;
  readonly slug: string;
  readonly settings: TenantSettings;
  readonly plan: Plan;
  readonly planLimits: PlanLimits;
  readonly onboardingState: OnboardingState;
  readonly stripeCustomerId: string | null;
  readonly stripeSubscriptionId: string | null;
  readonly slackInstallation: SlackInstallation | null;
  readonly teamsInstallation: TeamsInstallation | null;
  readonly isActive: boolean;
  readonly deactivatedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
