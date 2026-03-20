"use client";

/**
 * Balances page — leave balance summary with bar chart visualization.
 */

import { useState } from "react";
import { useBalances, type EmployeeBalance, type LeaveTypeBalance } from "@/hooks/use-balances";
import { useTeams } from "@/hooks/use-teams";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { glassSelectClass } from "@/components/ui/form-field";
import {
  GlassTable,
  GlassTableHead,
  GlassTableTh,
  GlassTableBody,
  GlassTableRow,
  GlassTableTd,
} from "@/components/ui/glass-table";
import { cn } from "@/lib/utils";

/* =========================================================================
   Balance cell
   ========================================================================= */

function BalanceCell({ balance }: { readonly balance: LeaveTypeBalance }) {
  const usedPercent = Math.min(
    100,
    balance.total > 0 ? (balance.used / balance.total) * 100 : 0
  );
  const isLow = balance.remaining / Math.max(1, balance.total) < 0.2;

  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <p
        className={cn(
          "font-mono text-xs font-medium",
          isLow ? "text-accent-amber" : "text-text-secondary"
        )}
      >
        {balance.used}/{balance.total}d
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isLow ? "bg-accent-amber" : "bg-accent-emerald"
          )}
          style={{ width: `${usedPercent}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   Bar chart — stacked horizontal bars per employee
   ========================================================================= */

function BalancesChart({
  balances,
}: {
  readonly balances: readonly EmployeeBalance[];
}) {
  // Collect all unique leave types
  const leaveTypeIds = Array.from(
    new Set(
      balances.flatMap((b) => b.balances.map((lb) => lb.leaveTypeId))
    )
  );

  const leaveTypeMap = balances
    .flatMap((b) => b.balances)
    .reduce<Record<string, { name: string; color: string }>>((acc, lb) => {
      if (!acc[lb.leaveTypeId]) {
        acc[lb.leaveTypeId] = {
          name: lb.leaveTypeName,
          color: lb.leaveTypeColor,
        };
      }
      return acc;
    }, {});

  if (balances.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h2 className="mb-4 font-display text-base font-semibold text-text-primary">
        Balance Overview
      </h2>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-3">
        {leaveTypeIds.map((id) => {
          const lt = leaveTypeMap[id];
          if (!lt) return null;
          return (
            <div key={id} className="flex items-center gap-1.5">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: lt.color }}
              />
              <span className="text-xs text-text-secondary">{lt.name}</span>
            </div>
          );
        })}
      </div>

      {/* Bars */}
      <div className="space-y-3">
        {balances.slice(0, 15).map((emp) => {
          const totalDays = emp.balances.reduce((s, b) => s + b.total, 0);

          return (
            <div key={emp.employeeId} className="flex items-center gap-3">
              <span className="w-32 flex-shrink-0 truncate text-xs text-text-secondary">
                {emp.employeeName}
              </span>
              <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-white/5">
                {leaveTypeIds.map((ltId) => {
                  const b = emp.balances.find((x) => x.leaveTypeId === ltId);
                  if (!b || totalDays === 0) return null;
                  const usedWidth = (b.used / totalDays) * 100;
                  const remainingWidth = (b.remaining / totalDays) * 100;
                  const lt = leaveTypeMap[ltId];

                  return (
                    <div key={ltId} className="flex h-full" style={{ width: `${(b.total / totalDays) * 100}%` }}>
                      {/* Used portion — darker */}
                      <div
                        className="h-full opacity-40"
                        style={{
                          width: `${usedWidth}%`,
                          backgroundColor: lt?.color,
                        }}
                        title={`${b.leaveTypeName}: ${b.used} used`}
                      />
                      {/* Remaining portion */}
                      <div
                        className="h-full"
                        style={{
                          width: `${remainingWidth}%`,
                          backgroundColor: lt?.color,
                        }}
                        title={`${b.leaveTypeName}: ${b.remaining} remaining`}
                      />
                    </div>
                  );
                })}
              </div>
              <span className="w-10 flex-shrink-0 text-right font-mono text-xs text-text-tertiary">
                {emp.balances.reduce((s, b) => s + b.remaining, 0)}d
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function BalancesPage() {
  const { balances, isLoading, error, filters, setFilters, exportCsv } = useBalances();
  const { teams } = useTeams();

  // Collect unique leave types for dynamic columns
  const leaveTypeHeaders = Array.from(
    new Map(
      balances
        .flatMap((b) => b.balances)
        .map((lb) => [lb.leaveTypeId, { id: lb.leaveTypeId, name: lb.leaveTypeName, color: lb.leaveTypeColor }])
    ).values()
  );

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Leave Balances"
        subtitle="Track remaining leave entitlements across your organization."
        action={
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        }
      />

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          value={filters.teamId ?? ""}
          onChange={(e) => setFilters({ teamId: e.target.value || undefined })}
          className={cn(glassSelectClass, "w-44")}
        >
          <option value="">All teams</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shimmer h-16 rounded-2xl" />
          ))}
        </div>
      ) : balances.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            title="No balance data found"
            description="Assign employees to leave types to see balance data here."
          />
        </div>
      ) : (
        <>
          {/* Chart */}
          <BalancesChart balances={balances} />

          {/* Table */}
          <GlassTable>
            <GlassTableHead>
              <GlassTableTh>Employee</GlassTableTh>
              <GlassTableTh>Team</GlassTableTh>
              {leaveTypeHeaders.map((lt) => (
                <GlassTableTh key={lt.id}>
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: lt.color }}
                    />
                    {lt.name}
                  </div>
                </GlassTableTh>
              ))}
            </GlassTableHead>
            <GlassTableBody>
              {balances.map((emp) => (
                <GlassTableRow key={emp.employeeId}>
                  <GlassTableTd>
                    <span className="font-medium text-text-primary">
                      {emp.employeeName}
                    </span>
                  </GlassTableTd>
                  <GlassTableTd>{emp.teamName}</GlassTableTd>
                  {leaveTypeHeaders.map((lt) => {
                    const b = emp.balances.find((x) => x.leaveTypeId === lt.id);
                    return (
                      <GlassTableTd key={lt.id}>
                        {b ? (
                          <BalanceCell balance={b} />
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </GlassTableTd>
                    );
                  })}
                </GlassTableRow>
              ))}
            </GlassTableBody>
          </GlassTable>
        </>
      )}
    </div>
  );
}
