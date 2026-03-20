/**
 * Subscription plan identifiers.
 */
export const PLANS = {
  free: "free",
  team: "team",
  business: "business",
  enterprise: "enterprise",
} as const;

export type Plan = (typeof PLANS)[keyof typeof PLANS];

/**
 * Hard limits enforced per plan.
 * These are pre-computed onto the tenant document at plan-change time
 * so the API can check limits without querying Stripe.
 */
export const PLAN_LIMITS = {
  [PLANS.free]: {
    maxEmployees: 10,
    maxWorkflows: 1,
    maxLeaveTypes: 3,
  },
  [PLANS.team]: {
    maxEmployees: 50,
    maxWorkflows: 5,
    maxLeaveTypes: 10,
  },
  [PLANS.business]: {
    maxEmployees: 200,
    maxWorkflows: 20,
    maxLeaveTypes: 25,
  },
  [PLANS.enterprise]: {
    /** Sentinel value: no limit enforced. */
    maxEmployees: Infinity,
    maxWorkflows: Infinity,
    maxLeaveTypes: Infinity,
  },
} as const satisfies Record<
  Plan,
  { maxEmployees: number; maxWorkflows: number; maxLeaveTypes: number }
>;

export type PlanLimits = (typeof PLAN_LIMITS)[Plan];
