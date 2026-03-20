/**
 * Service-level types for the tenant module.
 */

export interface CreateTenantInput {
  name: string;
  slug: string;
  plan?: "free" | "team" | "business" | "enterprise";
  timezone?: string;
  country?: string;
  workWeek?: number[];
}

export interface UpdateTenantSettingsInput {
  timezone?: string;
  workWeek?: number[];
  country?: string;
  coverageThreshold?: number;
  fiscalYearStartMonth?: number;
  locale?: string;
}

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  settings: {
    timezone: string;
    fiscalYearStartMonth: number;
    workWeek: number[];
    coverageMinimumPercent: number;
    announcementChannelEnabled: boolean;
    locale: string;
  };
  planLimits: {
    maxEmployees: number;
    maxWorkflowSteps: number;
    maxLeaveTypes: number;
    maxPlatforms: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanLimits {
  maxEmployees: number;
  maxWorkflowSteps: number;
  maxLeaveTypes: number;
  maxPlatforms: number;
}
