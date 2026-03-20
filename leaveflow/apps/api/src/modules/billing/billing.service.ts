/**
 * Billing service — Stripe customer and subscription management.
 *
 * Responsibilities:
 * - Get billing status for a tenant (current plan + Stripe subscription)
 * - Create Stripe checkout session for plan upgrade
 * - Create Stripe customer portal session for self-service management
 * - Handle Stripe webhooks to keep tenant plan in sync
 */

import type { TenantRepository } from "../tenant/tenant.repository.js";
import type { PlanLimits } from "../tenant/tenant.types.js";

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

// Price per seat in cents per month
const PLAN_PRICES_CENTS: Record<string, number> = {
  free: 0,
  team: 500,
  business: 1200,
  enterprise: 2500,
};

// ----------------------------------------------------------------
// Stripe adapter interface (injected to allow mocking)
// ----------------------------------------------------------------

export interface StripeAdapter {
  createCustomer(email: string, metadata: Record<string, string>): Promise<{ id: string }>;
  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }): Promise<{ url: string }>;
  createPortalSession(params: {
    customerId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): StripeWebhookEvent;
  getPriceId(plan: string): string;
}

export interface StripeWebhookEvent {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

// ----------------------------------------------------------------
// Service types
// ----------------------------------------------------------------

export interface BillingStatus {
  tenantId: string;
  currentPlan: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  planLimits: PlanLimits;
}

export interface BillingService {
  getBillingStatus(tenantId: string): Promise<BillingStatus>;
  createCheckoutSession(params: {
    tenantId: string;
    plan: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url: string }>;
  createPortalSession(params: {
    tenantId: string;
    returnUrl: string;
  }): Promise<{ url: string }>;
  handleWebhook(params: {
    payload: string | Buffer;
    signature: string;
    webhookSecret: string;
  }): Promise<void>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createBillingService(deps: {
  tenantRepo: TenantRepository;
  stripe: StripeAdapter;
}): BillingService {
  const { tenantRepo, stripe } = deps;

  return {
    async getBillingStatus(tenantId: string): Promise<BillingStatus> {
      const tenant = await tenantRepo.findById(tenantId);
      if (tenant === null) {
        throw new Error(`Tenant not found: ${tenantId}`);
      }

      const planLimits = PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS["free"]!;

      return {
        tenantId,
        currentPlan: tenant.plan,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionStatus: tenant.plan === "free" ? null : "active",
        currentPeriodEnd: null,
        planLimits: { ...planLimits },
      };
    },

    async createCheckoutSession(params: {
      tenantId: string;
      plan: string;
      successUrl: string;
      cancelUrl: string;
    }): Promise<{ url: string }> {
      const tenant = await tenantRepo.findById(params.tenantId);
      if (tenant === null) {
        throw new Error(`Tenant not found: ${params.tenantId}`);
      }

      if (params.plan === "free") {
        throw new Error("Cannot create a checkout session for the free plan");
      }

      // Create or reuse Stripe customer — in a real app, stripeCustomerId
      // would be stored on the tenant document. Here we create fresh.
      const customer = await stripe.createCustomer(
        `admin@${tenant.slug}.example`,
        { tenantId: params.tenantId, tenantSlug: tenant.slug }
      );

      const priceId = stripe.getPriceId(params.plan);

      const session = await stripe.createCheckoutSession({
        customerId: customer.id,
        priceId,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
        metadata: { tenantId: params.tenantId, plan: params.plan },
      });

      return { url: session.url };
    },

    async createPortalSession(params: {
      tenantId: string;
      returnUrl: string;
    }): Promise<{ url: string }> {
      const tenant = await tenantRepo.findById(params.tenantId);
      if (tenant === null) {
        throw new Error(`Tenant not found: ${params.tenantId}`);
      }

      if (tenant.plan === "free") {
        throw new Error(
          "Customer portal is only available for paid subscribers"
        );
      }

      // In a real app the stripeCustomerId would be persisted on the tenant.
      // For now we create a fresh customer as a placeholder.
      const customer = await stripe.createCustomer(
        `admin@${tenant.slug}.example`,
        { tenantId: params.tenantId }
      );

      const session = await stripe.createPortalSession({
        customerId: customer.id,
        returnUrl: params.returnUrl,
      });

      return { url: session.url };
    },

    async handleWebhook(params: {
      payload: string | Buffer;
      signature: string;
      webhookSecret: string;
    }): Promise<void> {
      const event = stripe.constructWebhookEvent(
        params.payload,
        params.signature,
        params.webhookSecret
      );

      await processWebhookEvent(event, tenantRepo);
    },
  };
}

// ----------------------------------------------------------------
// Webhook event processor (pure logic, no Stripe dependency)
// ----------------------------------------------------------------

async function processWebhookEvent(
  event: StripeWebhookEvent,
  tenantRepo: TenantRepository
): Promise<void> {
  const obj = event.data.object;

  switch (event.type) {
    case "invoice.paid": {
      const tenantId = extractMetadataTenantId(obj);
      const plan = extractMetadataPlan(obj);
      if (tenantId !== null && plan !== null) {
        await updateTenantPlan(tenantRepo, tenantId, plan);
      }
      break;
    }

    case "customer.subscription.updated": {
      const tenantId = extractMetadataTenantId(obj);
      const plan = extractPlanFromSubscription(obj);
      if (tenantId !== null && plan !== null) {
        await updateTenantPlan(tenantRepo, tenantId, plan);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const tenantId = extractMetadataTenantId(obj);
      if (tenantId !== null) {
        await updateTenantPlan(tenantRepo, tenantId, "free");
      }
      break;
    }

    default:
      // Unhandled event types are silently ignored
      break;
  }
}

async function updateTenantPlan(
  tenantRepo: TenantRepository,
  tenantId: string,
  plan: string
): Promise<void> {
  const validPlan = plan as "free" | "team" | "business" | "enterprise";
  // We use the update method to persist the plan change
  await tenantRepo.update(tenantId, { plan: validPlan });
}

function extractMetadataTenantId(
  obj: Record<string, unknown>
): string | null {
  const metadata = obj["metadata"];
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "tenantId" in metadata
  ) {
    const value = (metadata as Record<string, unknown>)["tenantId"];
    return typeof value === "string" ? value : null;
  }
  return null;
}

function extractMetadataPlan(
  obj: Record<string, unknown>
): string | null {
  const metadata = obj["metadata"];
  if (
    typeof metadata === "object" &&
    metadata !== null &&
    "plan" in metadata
  ) {
    const value = (metadata as Record<string, unknown>)["plan"];
    return typeof value === "string" ? value : null;
  }
  return null;
}

function extractPlanFromSubscription(
  obj: Record<string, unknown>
): string | null {
  // Find plan from subscription metadata first
  const plan = extractMetadataPlan(obj);
  if (plan !== null) return plan;

  // Fall back to reading from items[0].price.lookup_key or nickname
  const items = obj["items"];
  if (
    typeof items === "object" &&
    items !== null &&
    "data" in items
  ) {
    const data = (items as Record<string, unknown>)["data"];
    if (Array.isArray(data) && data.length > 0) {
      const firstItem = data[0] as Record<string, unknown>;
      const price = firstItem["price"] as Record<string, unknown> | undefined;
      const lookupKey = price?.["lookup_key"];
      if (typeof lookupKey === "string") return lookupKey;
    }
  }

  return null;
}

// Export for testing
export { PLAN_LIMITS, PLAN_PRICES_CENTS };
