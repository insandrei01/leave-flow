"use client";

/**
 * Manager Team View page — bento grid with team members, pending approvals,
 * team calendar, and team balance summary.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { RejectDialog } from "@/components/approvals/reject-dialog";
import {
  useTeamMembers,
  useManagerPendingApprovals,
  useTeamCalendarWeek,
  useTeamBalanceSummary,
  type TeamMember,
  type PendingApprovalItem,
  type TeamCalendarDay,
  type TeamBalanceSummary,
  type EmployeeStatus,
} from "@/hooks/use-team-view";

/* =========================================================================
   Status helpers
   ========================================================================= */

const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  "in-office": "In Office",
  "on-leave": "On Leave",
  "upcoming-leave": "Upcoming Leave",
};

const EMPLOYEE_STATUS_CLASSES: Record<EmployeeStatus, string> = {
  "in-office": "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
  "on-leave": "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  "upcoming-leave": "bg-accent-indigo/10 text-accent-indigo border-accent-indigo/20",
};

/* =========================================================================
   Page
   ========================================================================= */

export default function MyTeamPage() {
  const [rejectTarget, setRejectTarget] = useState<{
    id: string;
    employeeName: string;
  } | null>(null);

  const { members, isLoading: membersLoading } = useTeamMembers();
  const {
    approvals,
    isLoading: approvalsLoading,
    approve,
    reject,
    isActing,
  } = useManagerPendingApprovals();
  const { days: calendarDays } = useTeamCalendarWeek();
  const { summaries: balanceSummaries } = useTeamBalanceSummary();

  async function handleApprove(id: string) {
    await approve(id);
  }

  async function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return;
    await reject(rejectTarget.id, reason);
    setRejectTarget(null);
  }

  return (
    <div className="min-h-screen p-6">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-text-primary">
          My Team
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your team's leave and approvals
        </p>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Team members grid — spans 2 columns */}
        <section
          aria-label="Team members"
          className="col-span-2 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Team Members
          </h2>
          {membersLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shimmer h-20 rounded-xl" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-text-tertiary">No team members found</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {members.map((member) => (
                <TeamMemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </section>

        {/* Team balance summary */}
        <section
          aria-label="Team balance summary"
          className="col-span-1 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Avg. Remaining
          </h2>
          {balanceSummaries.length === 0 ? (
            <p className="text-sm text-text-tertiary">No balance data</p>
          ) : (
            <div className="flex flex-col gap-4">
              {balanceSummaries.map((summary) => (
                <BalanceBar key={summary.leaveTypeName} summary={summary} />
              ))}
            </div>
          )}
        </section>

        {/* Pending approvals */}
        <section
          aria-label="Pending approvals"
          className="col-span-2 glass-card p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
              Pending Approvals
            </h2>
            {approvals.length > 0 && (
              <span className="rounded-full bg-accent-amber/10 px-2 py-0.5 font-mono text-xs text-accent-amber">
                {approvals.length}
              </span>
            )}
          </div>

          {approvalsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="shimmer h-24 rounded-xl" />
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-text-secondary">
                All caught up
              </p>
              <p className="text-xs text-text-tertiary">
                No pending approvals
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {approvals.map((approval) => (
                <PendingApprovalCard
                  key={approval.id}
                  approval={approval}
                  isActing={isActing}
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
          )}
        </section>

        {/* Team calendar mini */}
        <section
          aria-label="Team calendar this week"
          className="col-span-1 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            This Week
          </h2>
          {calendarDays.length === 0 ? (
            <p className="text-sm text-text-tertiary">
              No absences this week
            </p>
          ) : (
            <TeamCalendarWeek days={calendarDays} />
          )}
        </section>
      </div>

      {/* Reject dialog */}
      <RejectDialog
        isOpen={rejectTarget !== null}
        requestId={rejectTarget?.id ?? ""}
        employeeName={rejectTarget?.employeeName ?? ""}
        isRejecting={isActing}
        onConfirm={handleRejectConfirm}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  );
}

/* =========================================================================
   TeamMemberCard
   ========================================================================= */

function TeamMemberCard({ member }: { readonly member: TeamMember }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      {/* Avatar */}
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white"
        style={{ backgroundColor: member.avatarColor }}
        aria-label={member.name}
      >
        <span className="text-sm">{member.avatarInitials}</span>
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text-primary">
          {member.name}
        </p>
        <p className="truncate text-xs text-text-secondary">{member.role}</p>
      </div>

      {/* Status badge */}
      <span
        className={cn(
          "flex-shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs",
          EMPLOYEE_STATUS_CLASSES[member.status]
        )}
      >
        {EMPLOYEE_STATUS_LABELS[member.status]}
      </span>
    </div>
  );
}

/* =========================================================================
   PendingApprovalCard
   ========================================================================= */

function PendingApprovalCard({
  approval,
  isActing,
  onApprove,
  onReject,
}: {
  readonly approval: PendingApprovalItem;
  readonly isActing: boolean;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center gap-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ backgroundColor: approval.employeeAvatarColor }}
        >
          {approval.employeeAvatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary">
            {approval.employeeName}
          </p>
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: approval.leaveTypeColor }}
            />
            <span>{approval.leaveTypeName}</span>
            <span className="text-text-tertiary">·</span>
            <span className="font-mono">
              {formatDateRange(approval.startDate, approval.endDate)}
            </span>
            <span className="text-text-tertiary">·</span>
            <span>{approval.workingDays}d</span>
          </div>
        </div>
      </div>

      {/* Mini journey */}
      {approval.approvalSteps.length > 0 && (
        <div className="mb-3 flex items-center gap-1">
          {approval.approvalSteps.map((step, idx) => (
            <div key={idx} className="flex flex-1 items-center gap-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    step.status === "completed"
                      ? "bg-accent-emerald"
                      : step.status === "active"
                        ? "bg-accent-indigo animate-pulse"
                        : "bg-white/20"
                  )}
                />
              </div>
              {idx < approval.approvalSteps.length - 1 && (
                <div className="flex-1 border-t border-dashed border-white/10" />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={isActing}
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
            isActing
              ? "cursor-not-allowed bg-white/5 text-text-tertiary"
              : "bg-accent-emerald/10 text-accent-emerald hover:bg-accent-emerald/20"
          )}
        >
          Approve
        </button>
        <button
          type="button"
          onClick={onReject}
          disabled={isActing}
          className={cn(
            "flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
            isActing
              ? "cursor-not-allowed bg-white/5 text-text-tertiary"
              : "bg-accent-rose/10 text-accent-rose hover:bg-accent-rose/20"
          )}
        >
          Reject
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   TeamCalendarWeek
   ========================================================================= */

function TeamCalendarWeek({ days }: { readonly days: readonly TeamCalendarDay[] }) {
  return (
    <div className="flex flex-col gap-2">
      {days.map((day) => (
        <div key={day.date}>
          <p className="mb-1 font-mono text-xs font-semibold text-text-tertiary">
            {new Date(day.date).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          {day.absences.length === 0 ? (
            <p className="text-xs text-text-tertiary">Everyone in</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {day.absences.map((absence) => (
                <div
                  key={absence.employeeId}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: absence.avatarColor }}
                  title={`${absence.employeeName} — ${absence.leaveTypeName}`}
                >
                  {absence.avatarInitials}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   BalanceBar
   ========================================================================= */

function BalanceBar({
  summary,
}: {
  readonly summary: TeamBalanceSummary;
}) {
  const fillPercent =
    summary.totalDays > 0
      ? Math.min(100, (summary.averageRemainingDays / summary.totalDays) * 100)
      : 0;

  const isLow = fillPercent < 20;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: summary.leaveTypeColor }}
          />
          <span className="text-xs font-medium text-text-primary">
            {summary.leaveTypeName}
          </span>
        </div>
        <span
          className={cn(
            "font-mono text-xs",
            isLow ? "text-accent-amber" : "text-text-secondary"
          )}
        >
          {summary.averageRemainingDays.toFixed(1)}d avg
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            isLow ? "bg-accent-amber" : "bg-accent-emerald"
          )}
          style={{ width: `${fillPercent}%` }}
          role="progressbar"
          aria-valuenow={summary.averageRemainingDays}
          aria-valuemin={0}
          aria-valuemax={summary.totalDays}
          aria-label={`${summary.leaveTypeName}: ${summary.averageRemainingDays.toFixed(1)} days average remaining`}
        />
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
