"use client";

/**
 * Billing page — current plan, usage, and plan upgrade.
 */

import { useState } from "react";
import { useBilling, type PlanTier, type Plan } from "@/hooks/use-billing";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/* =========================================================================
   Plan card
   ========================================================================= */

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  isUpgrading,
}: {
  readonly plan: Plan;
  readonly isCurrent: boolean;
  readonly onUpgrade: (tier: PlanTier) => void;
  readonly isUpgrading: boolean;
}) {
  const priceLabel =
    plan.pricePerSeat === 0
      ? "Free"
      : `$${(plan.pricePerSeat / 100).toFixed(0)}/seat/mo`;

  const employeeLimitLabel =
    plan.employeeLimit === null
      ? "Unlimited employees"
      : `Up to ${plan.employeeLimit} employees`;

  return (
    <div
      className={cn(
        "glass-card flex flex-col gap-4 p-6 transition-all",
        isCurrent && "ring-1 ring-accent-indigo/40 border-accent-indigo/30"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-text-primary">
            {plan.name}
          </h3>
          <p className="text-sm text-text-secondary">{employeeLimitLabel}</p>
        </div>
        {isCurrent && (
          <span className="rounded-full bg-accent-indigo/20 px-3 py-1 text-xs font-medium text-accent-indigo">
            Current plan
          </span>
        )}
      </div>

      {/* Price */}
      <p className="font-display text-2xl font-bold text-text-primary">
        {priceLabel}
      </p>

      {/* Features */}
      <ul className="flex flex-col gap-2">
        {plan.features.map((feature) => (
          <li key={feature.label} className="flex items-center gap-2 text-sm">
            {feature.included ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-accent-emerald">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-text-tertiary">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            )}
            <span className={feature.included ? "text-text-secondary" : "text-text-tertiary"}>
              {feature.label}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {!isCurrent && (
        <button
          type="button"
          onClick={() => onUpgrade(plan.tier)}
          disabled={isUpgrading}
          className={cn(
            "mt-auto rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
            plan.pricePerSeat === 0
              ? "border border-white/10 text-text-secondary hover:bg-white/5 hover:text-text-primary"
              : "bg-accent-indigo/20 text-accent-indigo hover:bg-accent-indigo/30",
            "disabled:opacity-50"
          )}
        >
          {isUpgrading ? "Redirecting..." : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  );
}

/* =========================================================================
   Usage bar
   ========================================================================= */

function UsageBar({
  used,
  limit,
}: {
  readonly used: number;
  readonly limit: number | null;
}) {
  if (limit === null) {
    return (
      <p className="text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{used}</span> employees (unlimited)
      </p>
    );
  }

  const percent = Math.min(100, (used / limit) * 100);
  const isNearLimit = percent >= 80;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          <span className="font-semibold text-text-primary">{used}</span> /{" "}
          {limit} employees used
        </span>
        <span
          className={cn(
            "font-mono text-xs",
            isNearLimit ? "text-accent-amber" : "text-text-tertiary"
          )}
        >
          {percent.toFixed(0)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isNearLimit ? "bg-accent-amber" : "bg-accent-emerald"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function BillingPage() {
  const { billing, isLoading, error, upgrade } = useBilling();
  const [upgradingTier, setUpgradingTier] = useState<PlanTier | null>(null);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);

  async function handleUpgrade(tier: PlanTier) {
    setUpgradingTier(tier);
    setUpgradeError(null);
    try {
      await upgrade(tier);
    } catch (err) {
      setUpgradeError(err instanceof Error ? err.message : "Failed to start checkout");
    } finally {
      setUpgradingTier(null);
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Billing"
        subtitle="Manage your subscription and usage."
      />

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {upgradeError && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {upgradeError}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="shimmer h-40 rounded-2xl" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="shimmer h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : billing ? (
        <>
          {/* Current plan overview */}
          <section className="glass-card p-6">
            <h2 className="mb-4 font-display text-base font-semibold text-text-primary">
              Current Plan
            </h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-lg font-semibold text-text-primary">
                  {billing.currentPlan.name}
                </p>
                {billing.currentPlan.renewsAt && (
                  <p className="text-sm text-text-secondary">
                    Renews{" "}
                    {new Date(billing.currentPlan.renewsAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="min-w-[280px]">
                <UsageBar
                  used={billing.currentPlan.usage.employeesUsed}
                  limit={billing.currentPlan.usage.employeeLimit}
                />
              </div>
            </div>
          </section>

          {/* Plan comparison */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {billing.availablePlans.map((plan) => (
              <PlanCard
                key={plan.tier}
                plan={plan}
                isCurrent={plan.tier === billing.currentPlan.tier}
                onUpgrade={handleUpgrade}
                isUpgrading={upgradingTier === plan.tier}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
