"use client";

/**
 * Employee Self-Service page — bento grid with balance rings,
 * active request tracker, request history, team calendar, and holidays.
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BalanceRing } from "@/components/shared/balance-ring";
import { LeaveRequestDialog } from "@/components/self-service/leave-request-dialog";
import {
  useLeaveBalances,
  useMyLeaveRequests,
  useTeamCalendar,
  useUpcomingHolidays,
  type LeaveRequest,
  type ApprovalStep,
  type TeamCalendarEntry,
  type Holiday,
} from "@/hooks/use-self-service";

/* =========================================================================
   Status helpers
   ========================================================================= */

const STATUS_LABELS: Record<LeaveRequest["status"], string> = {
  pending_approval: "Pending",
  pending_validation: "Validating",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<LeaveRequest["status"], string> = {
  pending_approval: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  pending_validation: "bg-accent-amber/10 text-accent-amber border-accent-amber/20",
  approved: "bg-accent-emerald/10 text-accent-emerald border-accent-emerald/20",
  rejected: "bg-accent-rose/10 text-accent-rose border-accent-rose/20",
  cancelled: "bg-white/5 text-text-tertiary border-white/10",
};

/* =========================================================================
   Page
   ========================================================================= */

export default function SelfServicePage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { balances, isLoading: balancesLoading } = useLeaveBalances();
  const { requests, isLoading: requestsLoading, refetch: refetchRequests } =
    useMyLeaveRequests();
  const { entries: calendarEntries } = useTeamCalendar();
  const { holidays } = useUpcomingHolidays();

  const activeRequests = requests.filter(
    (r) =>
      r.status === "pending_approval" || r.status === "pending_validation"
  );

  function handleRequestSuccess(newRequest: LeaveRequest) {
    setDialogOpen(false);
    refetchRequests();
    void newRequest; // acknowledge usage
  }

  return (
    <div className="min-h-screen p-6">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-text-primary">
            My Leave
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Track your balances, requests, and team schedule
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-accent-indigo px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-indigo/90"
        >
          <PlusIcon />
          Request Leave
        </button>
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-3 gap-4">
        {/* Balance rings row — spans full width */}
        <section
          aria-label="Leave balances"
          className="col-span-3 glass-card p-6"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Leave Balances
          </h2>
          {balancesLoading ? (
            <div className="flex gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer h-32 w-32 rounded-full" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-text-tertiary">No leave types configured</p>
          ) : (
            <div className="flex flex-wrap gap-8">
              {balances.map((balance) => (
                <BalanceRing
                  key={balance.leaveTypeId}
                  label={balance.leaveTypeName}
                  used={balance.usedDays}
                  total={balance.totalDays}
                  color={balance.leaveTypeColor}
                  size={100}
                />
              ))}
            </div>
          )}
        </section>

        {/* Active request tracker */}
        <section
          aria-label="Active requests"
          className="col-span-2 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Active Requests
          </h2>
          {activeRequests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-text-secondary">
                No pending requests
              </p>
              <p className="text-xs text-text-tertiary">
                Your approved requests will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {activeRequests.map((request) => (
                <ActiveRequestCard key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        {/* Upcoming holidays strip */}
        <section
          aria-label="Upcoming holidays"
          className="col-span-1 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Upcoming Holidays
          </h2>
          {holidays.length === 0 ? (
            <p className="text-sm text-text-tertiary">No upcoming holidays</p>
          ) : (
            <div className="flex flex-col gap-3">
              {holidays.map((holiday) => (
                <HolidayItem key={holiday.id} holiday={holiday} />
              ))}
            </div>
          )}
        </section>

        {/* Request history */}
        <section
          aria-label="Request history"
          className="col-span-2 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Request History
          </h2>
          {requestsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="shimmer h-16 rounded-xl" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <p className="text-sm text-text-secondary">No requests yet</p>
              <p className="text-xs text-text-tertiary">
                Your leave history will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {requests.slice(0, 8).map((request) => (
                <RequestHistoryRow key={request.id} request={request} />
              ))}
            </div>
          )}
        </section>

        {/* Team calendar mini */}
        <section
          aria-label="Team calendar"
          className="col-span-1 glass-card p-5"
        >
          <h2 className="mb-4 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Team This Week
          </h2>
          {calendarEntries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-text-secondary">Everyone's in</p>
              <p className="text-xs text-text-tertiary">
                No absences this week
              </p>
            </div>
          ) : (
            <TeamCalendarMini entries={calendarEntries} />
          )}
        </section>
      </div>

      {/* Leave request dialog */}
      <LeaveRequestDialog
        isOpen={dialogOpen}
        balances={balances}
        onClose={() => setDialogOpen(false)}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
}

/* =========================================================================
   ActiveRequestCard — mini journey timeline
   ========================================================================= */

function ActiveRequestCard({ request }: { readonly request: LeaveRequest }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: request.leaveTypeColor }}
          />
          <span className="text-sm font-semibold text-text-primary">
            {request.leaveTypeName}
          </span>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 font-mono text-xs font-semibold",
            STATUS_CLASSES[request.status]
          )}
        >
          {STATUS_LABELS[request.status]}
        </span>
      </div>

      {/* Dates */}
      <p className="mb-3 font-mono text-xs text-text-secondary">
        {formatDateRange(request.startDate, request.endDate)} ·{" "}
        {request.workingDays} working day
        {request.workingDays !== 1 ? "s" : ""}
      </p>

      {/* Mini journey timeline */}
      <div className="flex items-center gap-1">
        {request.approvalSteps.map((step, index) => (
          <JourneyStepDot
            key={index}
            step={step}
            isLast={index === request.approvalSteps.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function JourneyStepDot({
  step,
  isLast,
}: {
  readonly step: ApprovalStep;
  readonly isLast: boolean;
}) {
  const dotColor =
    step.status === "completed"
      ? "bg-accent-emerald"
      : step.status === "active"
        ? "bg-accent-indigo animate-pulse"
        : "bg-white/20";

  return (
    <div className="flex flex-1 items-center gap-1">
      <div className="flex flex-col items-center">
        <div
          className={cn("h-2.5 w-2.5 rounded-full", dotColor)}
          title={`${step.approverLabel}: ${step.status}`}
        />
        <p className="mt-0.5 max-w-[4rem] truncate text-center font-mono text-[9px] text-text-tertiary">
          {step.approverLabel}
        </p>
      </div>
      {!isLast && (
        <div className="mb-3 flex-1 border-t border-dashed border-white/15" />
      )}
    </div>
  );
}

/* =========================================================================
   RequestHistoryRow
   ========================================================================= */

function RequestHistoryRow({ request }: { readonly request: LeaveRequest }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5">
      <span
        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ backgroundColor: request.leaveTypeColor }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text-primary">
          {request.leaveTypeName}
        </p>
        <p className="font-mono text-xs text-text-secondary">
          {formatDateRange(request.startDate, request.endDate)}
        </p>
      </div>
      <span
        className={cn(
          "flex-shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs",
          STATUS_CLASSES[request.status]
        )}
      >
        {STATUS_LABELS[request.status]}
      </span>
    </div>
  );
}

/* =========================================================================
   TeamCalendarMini
   ========================================================================= */

function TeamCalendarMini({
  entries,
}: {
  readonly entries: readonly TeamCalendarEntry[];
}) {
  return (
    <div className="flex flex-col gap-2">
      {entries.slice(0, 6).map((entry) => (
        <div key={`${entry.employeeId}-${entry.startDate}`} className="flex items-center gap-2">
          {/* Avatar */}
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: entry.avatarColor }}
            aria-label={entry.employeeName}
          >
            {entry.avatarInitials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-text-primary">
              {entry.employeeName}
            </p>
            <p className="font-mono text-[10px] text-text-tertiary">
              {entry.leaveTypeName}
            </p>
          </div>

          {/* Status dot */}
          <div
            className={cn(
              "h-1.5 w-1.5 flex-shrink-0 rounded-full",
              entry.status === "approved" ? "bg-accent-emerald" : "bg-accent-amber"
            )}
          />
        </div>
      ))}
      {entries.length > 6 && (
        <p className="text-xs text-text-tertiary">
          +{entries.length - 6} more out this week
        </p>
      )}
    </div>
  );
}

/* =========================================================================
   HolidayItem
   ========================================================================= */

function HolidayItem({ holiday }: { readonly holiday: Holiday }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {holiday.name}
        </p>
        <p className="font-mono text-xs text-text-secondary">
          {new Date(holiday.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>
      <span
        className={cn(
          "flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
          holiday.daysUntil === 0
            ? "bg-accent-emerald/10 text-accent-emerald"
            : holiday.daysUntil <= 7
              ? "bg-accent-amber/10 text-accent-amber"
              : "bg-white/5 text-text-secondary"
        )}
      >
        {holiday.daysUntil === 0
          ? "Today"
          : holiday.daysUntil === 1
            ? "Tomorrow"
            : `${holiday.daysUntil}d`}
      </span>
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

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
    </svg>
  );
}
