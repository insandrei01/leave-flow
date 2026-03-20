"use client";

/**
 * Pending Approvals page — HR admin view of all pending leave requests.
 *
 * Glass card table with stale request highlighting (>48h), batch select,
 * batch approve, quick approve/reject actions, and team filter.
 */

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { RejectDialog } from "@/components/approvals/reject-dialog";
import {
  usePendingApprovals,
  useApproveRequest,
  useRejectRequest,
  useBatchApprove,
  type PendingApproval,
  type SortField,
} from "@/hooks/use-approvals";

/* =========================================================================
   Constants
   ========================================================================= */

const STALE_THRESHOLD_HOURS = 48;

/* =========================================================================
   Page
   ========================================================================= */

export default function ApprovalsPage() {
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    employeeName: string;
  } | null>(null);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    new Set()
  );

  const {
    filteredApprovals,
    isLoading,
    error,
    filter,
    setFilter,
    refetch,
  } = usePendingApprovals();

  const { approve, isApproving } = useApproveRequest(refetch);
  const { reject, isRejecting } = useRejectRequest(refetch);
  const { batchApprove, isBatchApproving } = useBatchApprove(refetch);

  /* Selection helpers */
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredApprovals.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApprovals.map((a) => a.id)));
    }
  }

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      if (!rejectTarget) return;
      await reject(rejectTarget.id, reason);
      setRejectTarget(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(rejectTarget.id);
        return next;
      });
    },
    [rejectTarget, reject]
  );

  async function handleApprove(id: string) {
    await approve(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  async function handleBatchApprove() {
    if (selectedIds.size === 0) return;
    await batchApprove([...selectedIds]);
    setSelectedIds(new Set());
  }

  const allSelected =
    filteredApprovals.length > 0 &&
    selectedIds.size === filteredApprovals.length;

  const staleCount = filteredApprovals.filter(
    (a) => a.ageHours >= STALE_THRESHOLD_HOURS
  ).length;

  return (
    <div className="min-h-screen p-6">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            Pending Approvals
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Review and action leave requests awaiting approval
          </p>
        </div>

        {/* Stale alert badge */}
        {staleCount > 0 && (
          <div className="flex items-center gap-2 rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-3 py-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent-rose" />
            <span className="text-sm font-medium text-accent-rose">
              {staleCount} stale request{staleCount !== 1 ? "s" : ""} &gt;48h
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-3 rounded-2xl border border-accent-rose/30 bg-accent-rose/10 p-4"
        >
          <p className="text-sm text-accent-rose">{error}</p>
          <button
            onClick={refetch}
            className="ml-auto text-xs text-accent-rose underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Batch approve */}
        {selectedIds.size > 0 && (
          <button
            type="button"
            onClick={() => void handleBatchApprove()}
            disabled={isBatchApproving}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
              isBatchApproving
                ? "cursor-not-allowed bg-white/10 text-text-tertiary"
                : "bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20"
            )}
          >
            <ApproveIcon />
            {isBatchApproving
              ? "Approving…"
              : `Approve ${selectedIds.size} Selected`}
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Sort */}
          <select
            value={filter.sortField}
            onChange={(e) =>
              setFilter({ sortField: e.target.value as SortField })
            }
            aria-label="Sort by"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-secondary focus:border-accent-indigo/50 focus:outline-none"
          >
            <option value="age">Sort: Oldest First</option>
            <option value="startDate">Sort: Leave Date</option>
            <option value="employeeName">Sort: Employee Name</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3" aria-busy="true" aria-label="Loading approvals">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="shimmer h-20 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && filteredApprovals.length === 0 && (
        <div className="glass-card flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-emerald/10">
            <CheckIcon />
          </div>
          <div>
            <p className="font-display text-lg font-semibold text-text-primary">
              All caught up
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              No pending approvals at the moment
            </p>
          </div>
        </div>
      )}

      {/* Approvals table */}
      {!isLoading && filteredApprovals.length > 0 && (
        <div className="glass-card overflow-hidden">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b border-white/10 px-5 py-3">
            <div className="flex-shrink-0">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                aria-label="Select all approvals"
                className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 accent-accent-indigo"
              />
            </div>
            <p className="flex-1 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Employee
            </p>
            <p className="w-28 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Leave Type
            </p>
            <p className="w-40 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Dates
            </p>
            <p className="w-16 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Days
            </p>
            <p className="w-24 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Submitted
            </p>
            <p className="w-16 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Age
            </p>
            <p className="w-32 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
              Actions
            </p>
          </div>

          {/* Rows */}
          <div>
            {filteredApprovals.map((approval) => (
              <ApprovalRow
                key={approval.id}
                approval={approval}
                isSelected={selectedIds.has(approval.id)}
                isApproving={isApproving}
                onToggleSelect={() => toggleSelect(approval.id)}
                onApprove={() => void handleApprove(approval.id)}
                onReject={() =>
                  setRejectTarget({
                    id: approval.id,
                    employeeName: approval.employeeName,
                  })
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Reject dialog */}
      <RejectDialog
        isOpen={rejectTarget !== null}
        requestId={rejectTarget?.id ?? ""}
        employeeName={rejectTarget?.employeeName ?? ""}
        isRejecting={isRejecting}
        onConfirm={(reason) => void handleRejectConfirm(reason)}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}

/* =========================================================================
   ApprovalRow
   ========================================================================= */

function ApprovalRow({
  approval,
  isSelected,
  isApproving,
  onToggleSelect,
  onApprove,
  onReject,
}: {
  readonly approval: PendingApproval;
  readonly isSelected: boolean;
  readonly isApproving: boolean;
  readonly onToggleSelect: () => void;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}) {
  const isStale = approval.ageHours >= STALE_THRESHOLD_HOURS;

  return (
    <div
      className={cn(
        "flex items-center gap-4 border-b border-white/5 px-5 py-4 transition-colors",
        isStale && "bg-accent-rose/5",
        isSelected && "bg-accent-indigo/5"
      )}
    >
      {/* Checkbox */}
      <div className="flex-shrink-0">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          aria-label={`Select ${approval.employeeName}'s request`}
          className="h-4 w-4 cursor-pointer rounded border-white/20 bg-white/5 accent-accent-indigo"
        />
      </div>

      {/* Employee */}
      <div className="flex flex-1 items-center gap-2.5">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: approval.employeeAvatarColor }}
          aria-hidden="true"
        >
          {approval.employeeAvatarInitials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-text-primary">
            {approval.employeeName}
          </p>
          <p className="text-xs text-text-tertiary">{approval.teamName}</p>
        </div>
      </div>

      {/* Leave type */}
      <div className="w-28 flex items-center gap-1.5">
        <span
          className="h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: approval.leaveTypeColor }}
        />
        <span className="truncate text-sm text-text-secondary">
          {approval.leaveTypeName}
        </span>
      </div>

      {/* Dates */}
      <div className="w-40">
        <p className="font-mono text-xs text-text-secondary">
          {formatDateRange(approval.startDate, approval.endDate)}
        </p>
      </div>

      {/* Working days */}
      <div className="w-16">
        <span className="font-mono text-sm text-text-primary">
          {approval.workingDays}d
        </span>
      </div>

      {/* Submitted */}
      <div className="w-24">
        <p className="font-mono text-xs text-text-tertiary">
          {new Date(approval.submittedAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Age */}
      <div className="w-16">
        {isStale ? (
          <span className="rounded-full bg-accent-rose/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent-rose">
            Stale
          </span>
        ) : (
          <span className="font-mono text-xs text-text-secondary">
            {formatAge(approval.ageHours)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex w-32 items-center gap-1.5">
        <button
          type="button"
          onClick={onApprove}
          disabled={isApproving}
          aria-label={`Approve ${approval.employeeName}'s request`}
          className={cn(
            "flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
            isApproving
              ? "cursor-not-allowed bg-white/5 text-text-tertiary"
              : "bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20"
          )}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          aria-label={`Reject ${approval.employeeName}'s request`}
          className="flex-1 rounded-lg bg-accent-rose/10 px-2.5 py-1.5 text-xs font-semibold text-accent-rose transition-colors hover:bg-accent-rose/20"
        >
          Reject
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   Helpers
   ========================================================================= */

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

  if (startDate === endDate) {
    return start.toLocaleDateString("en-US", opts);
  }

  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}`;
}

function formatAge(hours: number): string {
  if (hours < 1) return "<1h";
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/* =========================================================================
   Icons
   ========================================================================= */

function ApproveIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className="h-6 w-6 text-accent-emerald"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
