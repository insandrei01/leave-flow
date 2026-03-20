"use client";

/**
 * Requests page — leave request list with filters, sorting, and pagination.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRequests, type RequestStatus } from "@/hooks/use-requests";
import { useEmployees } from "@/hooks/use-employees";
import { useTeams } from "@/hooks/use-teams";
import { useLeaveBalances } from "@/hooks/use-self-service";
import { LeaveRequestDialog } from "@/components/self-service/leave-request-dialog";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { glassInputClass, glassSelectClass } from "@/components/ui/form-field";
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
   Status badge mapping
   ========================================================================= */

const STATUS_BADGE_VARIANTS: Record<
  RequestStatus,
  "approved" | "pending" | "rejected" | "cancelled" | "neutral"
> = {
  approved: "approved",
  auto_approved: "approved",
  pending_approval: "pending",
  pending_validation: "pending",
  rejected: "rejected",
  cancelled: "cancelled",
  validation_failed: "rejected",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  approved: "Approved",
  auto_approved: "Auto Approved",
  pending_approval: "Pending",
  pending_validation: "Validating",
  rejected: "Rejected",
  cancelled: "Cancelled",
  validation_failed: "Failed",
};

const ALL_STATUSES: RequestStatus[] = [
  "pending_approval",
  "pending_validation",
  "approved",
  "auto_approved",
  "rejected",
  "cancelled",
  "validation_failed",
];

/* =========================================================================
   Date formatter
   ========================================================================= */

function formatDateRange(start: string, end: string): string {
  const s = new Date(start).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const e = new Date(end).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return start === end ? e : `${s} – ${e}`;
}

function formatSubmitted(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* =========================================================================
   Status multi-select
   ========================================================================= */

function StatusMultiSelect({
  selected,
  onChange,
}: {
  readonly selected: readonly RequestStatus[];
  readonly onChange: (statuses: RequestStatus[]) => void;
}) {
  function toggle(status: RequestStatus) {
    const next = selected.includes(status)
      ? selected.filter((s) => s !== status)
      : [...selected, status];
    onChange(next);
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL_STATUSES.map((status) => {
        const isActive = selected.includes(status);
        return (
          <button
            key={status}
            type="button"
            onClick={() => toggle(status)}
            className={cn(
              "rounded-full px-2.5 py-0.5 font-mono text-xs font-medium transition-colors",
              isActive
                ? "bg-accent-indigo/20 text-accent-indigo"
                : "border border-white/10 text-text-tertiary hover:border-white/20 hover:text-text-secondary"
            )}
          >
            {STATUS_LABELS[status]}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function RequestsPage() {
  const router = useRouter();
  const { requests, isLoading, error, meta, filters, setFilters, page, setPage } =
    useRequests();
  const { employees } = useEmployees();
  const { teams } = useTeams();
  const { balances } = useLeaveBalances();

  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);

  const totalPages = meta?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <PageHeader
        title="Leave Requests"
        subtitle={`${meta?.total ?? 0} total requests`}
        action={
          <button
            type="button"
            onClick={() => setIsNewRequestOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Request
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <StatusMultiSelect
          selected={filters.statuses ?? []}
          onChange={(statuses) => setFilters({ ...filters, statuses })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.employeeId ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, employeeId: e.target.value || undefined })
            }
            className={cn(glassSelectClass, "w-48")}
          >
            <option value="">All employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          <select
            value={filters.teamId ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, teamId: e.target.value || undefined })
            }
            className={cn(glassSelectClass, "w-44")}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value || undefined })
            }
            className={cn(glassInputClass, "w-40")}
            aria-label="From date"
          />
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) =>
              setFilters({ ...filters, dateTo: e.target.value || undefined })
            }
            className={cn(glassInputClass, "w-40")}
            aria-label="To date"
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose">
          {error}
        </p>
      )}

      {isLoading ? (
        <div className="glass-card p-8">
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer h-12 rounded-xl" />
            ))}
          </div>
        </div>
      ) : requests.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            title="No requests found"
            description="Adjust the filters or submit a new leave request."
            action={
              <button
                type="button"
                onClick={() => setIsNewRequestOpen(true)}
                className="rounded-xl bg-accent-indigo/20 px-4 py-2 text-sm font-medium text-accent-indigo hover:bg-accent-indigo/30"
              >
                New Request
              </button>
            }
          />
        </div>
      ) : (
        <GlassTable>
          <GlassTableHead>
            <GlassTableTh>Status</GlassTableTh>
            <GlassTableTh>Employee</GlassTableTh>
            <GlassTableTh>Leave Type</GlassTableTh>
            <GlassTableTh>Dates</GlassTableTh>
            <GlassTableTh>Days</GlassTableTh>
            <GlassTableTh>Submitted</GlassTableTh>
          </GlassTableHead>
          <GlassTableBody>
            {requests.map((req) => (
              <GlassTableRow
                key={req.id}
                onClick={() => router.push(`/requests/${req.id}`)}
              >
                <GlassTableTd>
                  <StatusBadge
                    label={STATUS_LABELS[req.status]}
                    variant={STATUS_BADGE_VARIANTS[req.status]}
                  />
                </GlassTableTd>
                <GlassTableTd>
                  <span className="font-medium text-text-primary">
                    {req.employeeName}
                  </span>
                </GlassTableTd>
                <GlassTableTd>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: req.leaveTypeColor }}
                      aria-hidden="true"
                    />
                    {req.leaveTypeName}
                  </div>
                </GlassTableTd>
                <GlassTableTd>
                  {formatDateRange(req.startDate, req.endDate)}
                </GlassTableTd>
                <GlassTableTd>
                  <span className="font-mono text-xs">{req.workingDays}d</span>
                </GlassTableTd>
                <GlassTableTd>
                  {formatSubmitted(req.submittedAt)}
                </GlassTableTd>
              </GlassTableRow>
            ))}
          </GlassTableBody>
        </GlassTable>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* New request dialog */}
      <LeaveRequestDialog
        isOpen={isNewRequestOpen}
        balances={balances}
        onClose={() => setIsNewRequestOpen(false)}
        onSuccess={() => setIsNewRequestOpen(false)}
      />
    </div>
  );
}
