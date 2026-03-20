/**
 * Tenant service — business logic for tenant lifecycle management.
 *
 * Responsibilities:
 * - createTenant: used during registration flow
 * - updateSettings: update timezone, workWeek, country, coverageThreshold
 * - getPlanLimits: return plan limits for the given tenant
 */

import type { TenantRepository } from "./tenant.repository.js";
import type {
  CreateTenantInput,
  UpdateTenantSettingsInput,
  TenantRecord,
  PlanLimits,
} from "./tenant.types.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxEmployees: 10,
    maxWorkflowSteps: 1,
    maxLeaveTypes: 4,
    maxPlatforms: 1,
  },
  team: {
    maxEmployees: 50,
    maxWorkflowSteps: 3,
    maxLeaveTypes: 10,
    maxPlatforms: 2,
  },
  business: {
    maxEmployees: 250,
    maxWorkflowSteps: 5,
    maxLeaveTypes: 20,
    maxPlatforms: 3,
  },
  enterprise: {
    maxEmployees: 10000,
    maxWorkflowSteps: 10,
    maxLeaveTypes: 50,
    maxPlatforms: 4,
  },
};

const VALID_WORK_WEEK_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface TenantService {
  createTenant(input: CreateTenantInput): Promise<TenantRecord>;
  updateSettings(
    tenantId: string,
    input: UpdateTenantSettingsInput
  ): Promise<TenantRecord>;
  getPlanLimits(tenantId: string): Promise<PlanLimits>;
}

export function createTenantService(deps: {
  repo: TenantRepository;
}): TenantService {
  const { repo } = deps;

  return {
    async createTenant(input: CreateTenantInput): Promise<TenantRecord> {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error("Tenant name is required");
      }
      if (!input.slug || input.slug.trim().length === 0) {
        throw new Error("Tenant slug is required");
      }
      if (input.slug.length < 3 || input.slug.length > 50) {
        throw new Error("Tenant slug must be between 3 and 50 characters");
      }
      if (!/^[a-z0-9-]+$/.test(input.slug)) {
        throw new Error(
          "Tenant slug may only contain lowercase letters, digits and hyphens"
        );
      }

      if (input.workWeek !== undefined) {
        validateWorkWeek(input.workWeek);
      }

      return repo.create(input);
    },

    async updateSettings(
      tenantId: string,
      input: UpdateTenantSettingsInput
    ): Promise<TenantRecord> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }

      const existing = await repo.findById(tenantId);
      if (existing === null) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      if (input.workWeek !== undefined) {
        validateWorkWeek(input.workWeek);
      }

      if (
        input.coverageThreshold !== undefined &&
        (input.coverageThreshold < 0 || input.coverageThreshold > 100)
      ) {
        throw new Error("coverageThreshold must be between 0 and 100");
      }

      if (
        input.fiscalYearStartMonth !== undefined &&
        (input.fiscalYearStartMonth < 1 || input.fiscalYearStartMonth > 12)
      ) {
        throw new Error("fiscalYearStartMonth must be between 1 and 12");
      }

      const settingsPatch: Partial<TenantRecord["settings"]> = {};
      if (input.timezone !== undefined) settingsPatch.timezone = input.timezone;
      if (input.workWeek !== undefined) settingsPatch.workWeek = input.workWeek;
      if (input.coverageThreshold !== undefined)
        settingsPatch.coverageMinimumPercent = input.coverageThreshold;
      if (input.fiscalYearStartMonth !== undefined)
        settingsPatch.fiscalYearStartMonth = input.fiscalYearStartMonth;
      if (input.locale !== undefined) settingsPatch.locale = input.locale;

      const updated = await repo.update(tenantId, { settings: settingsPatch });
      if (updated === null) {
        throw new Error(`Failed to update tenant: ${tenantId}`);
      }

      return updated;
    },

    async getPlanLimits(tenantId: string): Promise<PlanLimits> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }

      const tenant = await repo.findById(tenantId);
      if (tenant === null) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const limits = PLAN_LIMITS[tenant.plan];
      if (limits === undefined) {
        throw new Error(`Unknown plan: ${tenant.plan}`);
      }

      return { ...limits };
    },
  };
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

function validateWorkWeek(workWeek: number[]): void {
  if (!Array.isArray(workWeek) || workWeek.length === 0) {
    throw new Error("workWeek must be a non-empty array");
  }
  for (const day of workWeek) {
    if (!VALID_WORK_WEEK_DAYS.has(day)) {
      throw new Error(
        `Invalid work week day: ${day}. Must be 0 (Sun) through 6 (Sat)`
      );
    }
  }
}
