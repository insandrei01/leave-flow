"use client";

/**
 * HR Dashboard page — bento grid with real-time widgets.
 */

import { useRouter } from "next/navigation";
import { useDashboard } from "@/hooks/use-dashboard";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { PageHeader } from "@/components/ui/page-header";

export default function DashboardPage(): React.ReactElement {
  const router = useRouter();
  const { state, refresh } = useDashboard();

  function handleRequestClick(id: string): void {
    router.push(`/requests/${id}`);
  }

  function handleDayClick(date: string): void {
    router.push(`/calendar?date=${date}`);
  }

  function handleViewAllPending(): void {
    router.push("/requests?status=pending_approval");
  }

  if (state.loading) {
    return (
      <div className="flex flex-col gap-6 overflow-y-auto p-6 animate-fade-in">
        <PageHeader
          title="Dashboard"
          subtitle="HR overview — loading..."
        />
        {/* Skeleton grid */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          aria-busy="true"
          aria-label="Loading dashboard"
        >
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              className="shimmer rounded-2xl"
              style={{
                height: i < 4 ? 120 : 200,
                gridColumn: i === 4 || i === 5 ? "span 2" : "span 1",
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (state.error || !state.data) {
    return (
      <div className="flex flex-col gap-6 overflow-y-auto p-6">
        <PageHeader title="Dashboard" subtitle="HR overview" />
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent-rose/20 bg-accent-rose/5 p-10 text-center">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            className="h-10 w-10 text-accent-rose/60"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M12 8v4M12 16h.01"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <p className="text-sm font-medium text-text-secondary">
            {state.error ?? "Failed to load dashboard."}
          </p>
          <button
            type="button"
            onClick={refresh}
            className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-semibold text-accent-indigo transition-all duration-400 hover:bg-accent-indigo/30"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 overflow-y-auto p-6 animate-slide-up scrollbar-none">
      <PageHeader
        title="Dashboard"
        subtitle="HR overview — all systems"
        action={
          <div className="flex items-center gap-3">
            {state.lastUpdated && (
              <span className="font-mono text-[11px] text-text-tertiary">
                Updated{" "}
                {state.lastUpdated.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={refresh}
              aria-label="Refresh dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-text-secondary transition-all duration-400 hover:bg-white/5 hover:text-text-primary"
            >
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M13.66 8A5.66 5.66 0 1 1 8 2.34M13.66 2.34v3.33H10.33"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Refresh
            </button>
          </div>
        }
      />

      <KpiGrid
        data={state.data}
        onRequestClick={handleRequestClick}
        onDayClick={handleDayClick}
        onViewAllPending={handleViewAllPending}
      />
    </div>
  );
}
