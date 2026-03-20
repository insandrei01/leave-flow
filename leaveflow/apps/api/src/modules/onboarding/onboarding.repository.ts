/**
 * Onboarding repository — storage for onboarding progress.
 *
 * Uses an in-memory Map as the backing store (no dedicated Mongoose model
 * for onboarding progress in Phase 1 — the data model delivers this via
 * the tenant document in a later phase). The Map is suitable for the
 * single-process test environment; Phase 3 will migrate to MongoDB.
 *
 * The repository interface is defined here so the service layer can depend
 * on the abstraction and tests can substitute a mock.
 */

import type { OnboardingProgress } from "./onboarding.types.js";

// ----------------------------------------------------------------
// Repository type
// ----------------------------------------------------------------

export interface OnboardingRepository {
  findByTenant(tenantId: string): Promise<OnboardingProgress | null>;
  upsert(tenantId: string, data: Partial<OnboardingProgress>): Promise<OnboardingProgress>;
}

// ----------------------------------------------------------------
// Factory (in-memory implementation)
// ----------------------------------------------------------------

export function createOnboardingRepository(): OnboardingRepository {
  const store = new Map<string, OnboardingProgress>();

  return {
    /**
     * Returns the current onboarding progress for a tenant, or null if
     * onboarding has not been initialised.
     */
    async findByTenant(tenantId: string): Promise<OnboardingProgress | null> {
      return store.get(tenantId) ?? null;
    },

    /**
     * Create or update the onboarding progress record.
     * Always returns a new object — the stored record is never mutated.
     */
    async upsert(
      tenantId: string,
      data: Partial<OnboardingProgress>
    ): Promise<OnboardingProgress> {
      const existing = store.get(tenantId);
      const now = new Date();

      const updated: OnboardingProgress = {
        tenantId,
        isComplete: data.isComplete ?? existing?.isComplete ?? false,
        currentStep: data.currentStep ?? existing?.currentStep ?? 1,
        steps: data.steps ?? existing?.steps ?? [],
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      store.set(tenantId, updated);
      return { ...updated };
    },
  };
}
