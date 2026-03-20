/**
 * Unit tests for the billing service.
 *
 * Uses mocked Stripe adapter and mocked TenantRepository.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createBillingService,
  PLAN_LIMITS,
} from "./billing.service.js";
import type { StripeAdapter, StripeWebhookEvent } from "./billing.service.js";
import type { TenantRepository } from "../tenant/tenant.repository.js";
import type { TenantRecord } from "../tenant/tenant.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

function buildTenant(overrides: Partial<TenantRecord> = {}): TenantRecord {
  return {
    id: "tenant-001",
    name: "ACME Corp",
    slug: "acme",
    plan: "free",
    isActive: true,
    settings: {
      timezone: "UTC",
      fiscalYearStartMonth: 1,
      workWeek: [1, 2, 3, 4, 5],
      coverageMinimumPercent: 50,
      announcementChannelEnabled: false,
      locale: "en",
    },
    planLimits: { ...PLAN_LIMITS["free"]! },
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

function buildMockTenantRepo(
  overrides: Partial<TenantRepository> = {}
): TenantRepository {
  return {
    findById: vi.fn().mockResolvedValue(buildTenant()),
    create: vi.fn().mockResolvedValue(buildTenant()),
    update: vi.fn().mockResolvedValue(buildTenant()),
    ...overrides,
  };
}

function buildMockStripe(overrides: Partial<StripeAdapter> = {}): StripeAdapter {
  return {
    createCustomer: vi.fn().mockResolvedValue({ id: "cus_test123" }),
    createCheckoutSession: vi
      .fn()
      .mockResolvedValue({ url: "https://checkout.stripe.com/test" }),
    createPortalSession: vi
      .fn()
      .mockResolvedValue({ url: "https://portal.stripe.com/test" }),
    constructWebhookEvent: vi.fn().mockReturnValue({
      type: "invoice.paid",
      data: { object: {} },
    } as StripeWebhookEvent),
    getPriceId: vi.fn().mockImplementation((plan: string) => `price_${plan}`),
    ...overrides,
  };
}

const TENANT_ID = "tenant-001";

// ----------------------------------------------------------------
// getBillingStatus
// ----------------------------------------------------------------

describe("BillingService.getBillingStatus", () => {
  it("returns billing status for a free tenant", async () => {
    const repo = buildMockTenantRepo();
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    const status = await service.getBillingStatus(TENANT_ID);

    expect(status.tenantId).toBe(TENANT_ID);
    expect(status.currentPlan).toBe("free");
    expect(status.stripeCustomerId).toBeNull();
    expect(status.subscriptionStatus).toBeNull();
    expect(status.planLimits.maxEmployees).toBe(10);
  });

  it("returns billing status for a paid tenant", async () => {
    const paidTenant = buildTenant({ plan: "business" });
    const repo = buildMockTenantRepo({
      findById: vi.fn().mockResolvedValue(paidTenant),
    });
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    const status = await service.getBillingStatus(TENANT_ID);

    expect(status.currentPlan).toBe("business");
    expect(status.subscriptionStatus).toBe("active");
    expect(status.planLimits.maxEmployees).toBe(250);
  });

  it("throws when tenant is not found", async () => {
    const repo = buildMockTenantRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    await expect(service.getBillingStatus("missing")).rejects.toThrow(
      /not found/i
    );
  });
});

// ----------------------------------------------------------------
// createCheckoutSession
// ----------------------------------------------------------------

describe("BillingService.createCheckoutSession", () => {
  it("creates a checkout session for a valid plan", async () => {
    const repo = buildMockTenantRepo();
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    const result = await service.createCheckoutSession({
      tenantId: TENANT_ID,
      plan: "business",
      successUrl: "https://app.example.com/billing/success",
      cancelUrl: "https://app.example.com/billing",
    });

    expect(result.url).toContain("checkout.stripe.com");
    expect(stripe.createCustomer).toHaveBeenCalledOnce();
    expect(stripe.createCheckoutSession).toHaveBeenCalledOnce();
    expect(stripe.getPriceId).toHaveBeenCalledWith("business");
  });

  it("throws when plan is free", async () => {
    const repo = buildMockTenantRepo();
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    await expect(
      service.createCheckoutSession({
        tenantId: TENANT_ID,
        plan: "free",
        successUrl: "https://app.example.com/billing/success",
        cancelUrl: "https://app.example.com/billing",
      })
    ).rejects.toThrow(/free plan/i);
  });

  it("throws when tenant is not found", async () => {
    const repo = buildMockTenantRepo({
      findById: vi.fn().mockResolvedValue(null),
    });
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    await expect(
      service.createCheckoutSession({
        tenantId: "missing",
        plan: "team",
        successUrl: "https://app.example.com/billing/success",
        cancelUrl: "https://app.example.com/billing",
      })
    ).rejects.toThrow(/not found/i);
  });
});

// ----------------------------------------------------------------
// createPortalSession
// ----------------------------------------------------------------

describe("BillingService.createPortalSession", () => {
  it("creates a portal session for a paid tenant", async () => {
    const paidTenant = buildTenant({ plan: "team" });
    const repo = buildMockTenantRepo({
      findById: vi.fn().mockResolvedValue(paidTenant),
    });
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    const result = await service.createPortalSession({
      tenantId: TENANT_ID,
      returnUrl: "https://app.example.com/billing",
    });

    expect(result.url).toContain("portal.stripe.com");
    expect(stripe.createPortalSession).toHaveBeenCalledOnce();
  });

  it("throws when tenant is on free plan", async () => {
    const repo = buildMockTenantRepo();
    const stripe = buildMockStripe();
    const service = createBillingService({ tenantRepo: repo, stripe });

    await expect(
      service.createPortalSession({
        tenantId: TENANT_ID,
        returnUrl: "https://app.example.com/billing",
      })
    ).rejects.toThrow(/paid subscribers/i);
  });
});

// ----------------------------------------------------------------
// handleWebhook
// ----------------------------------------------------------------

describe("BillingService.handleWebhook", () => {
  let repo: TenantRepository;
  let stripe: StripeAdapter;

  beforeEach(() => {
    repo = buildMockTenantRepo();
    stripe = buildMockStripe();
  });

  it("upgrades tenant plan on invoice.paid", async () => {
    stripe.constructWebhookEvent = vi.fn().mockReturnValue({
      type: "invoice.paid",
      data: {
        object: {
          metadata: { tenantId: TENANT_ID, plan: "team" },
        },
      },
    } as StripeWebhookEvent);

    const service = createBillingService({ tenantRepo: repo, stripe });

    await service.handleWebhook({
      payload: '{"type":"invoice.paid"}',
      signature: "t=123,v1=abc",
      webhookSecret: "whsec_test",
    });

    expect(repo.update).toHaveBeenCalledWith(TENANT_ID, expect.objectContaining({ plan: "team" }));
  });

  it("upgrades tenant plan on customer.subscription.updated", async () => {
    stripe.constructWebhookEvent = vi.fn().mockReturnValue({
      type: "customer.subscription.updated",
      data: {
        object: {
          metadata: { tenantId: TENANT_ID, plan: "business" },
        },
      },
    } as StripeWebhookEvent);

    const service = createBillingService({ tenantRepo: repo, stripe });

    await service.handleWebhook({
      payload: "{}",
      signature: "sig",
      webhookSecret: "secret",
    });

    expect(repo.update).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ plan: "business" })
    );
  });

  it("downgrades tenant to free on customer.subscription.deleted", async () => {
    stripe.constructWebhookEvent = vi.fn().mockReturnValue({
      type: "customer.subscription.deleted",
      data: {
        object: {
          metadata: { tenantId: TENANT_ID },
        },
      },
    } as StripeWebhookEvent);

    const service = createBillingService({ tenantRepo: repo, stripe });

    await service.handleWebhook({
      payload: "{}",
      signature: "sig",
      webhookSecret: "secret",
    });

    expect(repo.update).toHaveBeenCalledWith(
      TENANT_ID,
      expect.objectContaining({ plan: "free" })
    );
  });

  it("ignores unknown webhook event types without throwing", async () => {
    stripe.constructWebhookEvent = vi.fn().mockReturnValue({
      type: "payment_intent.created",
      data: { object: {} },
    } as StripeWebhookEvent);

    const service = createBillingService({ tenantRepo: repo, stripe });

    await expect(
      service.handleWebhook({
        payload: "{}",
        signature: "sig",
        webhookSecret: "secret",
      })
    ).resolves.not.toThrow();

    expect(repo.update).not.toHaveBeenCalled();
  });

  it("does not update tenant when metadata tenantId is missing", async () => {
    stripe.constructWebhookEvent = vi.fn().mockReturnValue({
      type: "invoice.paid",
      data: { object: { metadata: {} } },
    } as StripeWebhookEvent);

    const service = createBillingService({ tenantRepo: repo, stripe });

    await service.handleWebhook({
      payload: "{}",
      signature: "sig",
      webhookSecret: "secret",
    });

    expect(repo.update).not.toHaveBeenCalled();
  });
});
