"use client";

/**
 * Leave Request Detail page.
 *
 * Sections:
 * - Header: employee avatar, name, leave type badge, dates, working days count
 * - Impact grid: balance after, team members out, holiday overlap
 * - Approval Journey Timeline (signature component)
 * - Action buttons: Cancel / Approve / Reject / Force Approve
 * - Audit trail
 */

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLeaveRequest } from "@/hooks/use-leave-request";
import { cn } from "@/lib/utils";
import type {
  ApprovalStep,
  AuditEntry,
  LeaveRequest,
} from "@/hooks/use-leave-request";

/* =========================================================================
   Helpers
   ========================================================================= */

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatTimeout(hours: number, minutes: number): string {
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/* =========================================================================
   Request header
   ========================================================================= */

function RequestHeader({
  request,
}: {
  readonly request: LeaveRequest;
}): React.ReactElement {
  return (
    <div className="glass-card p-6">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold"
          style={{
            backgroundColor: `${request.employeeColor}25`,
            color: request.employeeColor,
          }}
          aria-hidden="true"
        >
          {request.employeeInitials}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-semibold text-text-primary">
            {request.employeeName}
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            {request.employeeTeam}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {/* Leave type badge */}
            <span
              className="flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-semibold"
              style={{
                backgroundColor: `${request.leaveTypeColor}20`,
                color: request.leaveTypeColor,
                border: `1px solid ${request.leaveTypeColor}40`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: request.leaveTypeColor }}
                aria-hidden="true"
              />
              {request.leaveType}
            </span>

            {/* Date range */}
            <span className="font-mono text-xs text-text-secondary">
              {formatDate(request.startDate)}
              {request.startDate !== request.endDate &&
                ` – ${formatDate(request.endDate)}`}
            </span>

            {/* Working days */}
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs text-text-tertiary">
              {request.workingDays} working {request.workingDays === 1 ? "day" : "days"}
            </span>
          </div>
        </div>

        {/* Status badge */}
        <StatusBadge status={request.status} />
      </div>

      {/* Reason */}
      {request.reason && (
        <div className="mt-4 rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
            Reason
          </p>
          <p className="mt-1 text-sm text-text-secondary">{request.reason}</p>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Status badge
   ========================================================================= */

const STATUS_CONFIG = {
  approved: { label: "Approved", color: "#34D399", bg: "bg-accent-emerald/15", border: "border-accent-emerald/30" },
  auto_approved: { label: "Auto-approved", color: "#34D399", bg: "bg-accent-emerald/15", border: "border-accent-emerald/30" },
  pending_approval: { label: "Pending", color: "#FBBF24", bg: "bg-accent-amber/15", border: "border-accent-amber/30" },
  pending_validation: { label: "Validating", color: "#FBBF24", bg: "bg-accent-amber/15", border: "border-accent-amber/30" },
  rejected: { label: "Rejected", color: "#FB7185", bg: "bg-accent-rose/15", border: "border-accent-rose/30" },
  cancelled: { label: "Cancelled", color: "#6B7280", bg: "bg-white/8", border: "border-white/10" },
  validation_failed: { label: "Failed", color: "#FB7185", bg: "bg-accent-rose/15", border: "border-accent-rose/30" },
} as const;

function StatusBadge({
  status,
}: {
  readonly status: LeaveRequest["status"];
}): React.ReactElement {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending_approval;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 font-mono text-xs font-semibold",
        config.bg,
        config.border
      )}
      style={{ color: config.color }}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}

/* =========================================================================
   Impact grid
   ========================================================================= */

function ImpactGrid({
  request,
}: {
  readonly request: LeaveRequest;
}): React.ReactElement {
  const { impact } = request;
  const balancePct =
    impact.balanceTotal > 0
      ? Math.min(100, (impact.balanceAfterApproval / impact.balanceTotal) * 100)
      : 0;
  const isLowBalance = balancePct < 20;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Balance after approval */}
      <div className="glass-card flex flex-col gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          Balance after approval
        </p>
        <div className="flex flex-col gap-1">
          <span
            className={cn(
              "font-display text-2xl font-bold",
              isLowBalance ? "text-accent-amber" : "text-text-primary"
            )}
          >
            {impact.balanceAfterApproval}
            <span className="ml-1 font-mono text-sm font-normal text-text-tertiary">
              days
            </span>
          </span>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-white/8"
            role="progressbar"
            aria-valuenow={Math.round(balancePct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${impact.balanceAfterApproval} of ${impact.balanceTotal} days remaining`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-all duration-600",
                isLowBalance ? "bg-accent-amber" : "bg-accent-emerald"
              )}
              style={{ width: `${balancePct}%` }}
            />
          </div>
          <p className="font-mono text-[10px] text-text-tertiary">
            of {impact.balanceTotal}d {impact.leaveTypeName} remaining
          </p>
        </div>
      </div>

      {/* Team members out same dates */}
      <div className="glass-card flex flex-col gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          Team out same dates
        </p>
        {impact.teamMembersOutSameDates.length === 0 ? (
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="h-4 w-4 text-accent-emerald"
              aria-hidden="true"
            >
              <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-text-secondary">No conflicts</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <div className="flex" aria-label="Team members also out">
              {impact.teamMembersOutSameDates.slice(0, 4).map((m, i) => (
                <div
                  key={m.name}
                  title={m.name}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface-primary font-mono text-[9px] font-semibold"
                  style={{
                    marginLeft: i === 0 ? 0 : -6,
                    backgroundColor: `${m.color}25`,
                    color: m.color,
                    zIndex: 4 - i,
                    position: "relative",
                  }}
                  aria-label={m.name}
                >
                  {m.initials}
                </div>
              ))}
            </div>
            <p className="text-xs text-text-secondary">
              {impact.teamMembersOutSameDates.length}{" "}
              {impact.teamMembersOutSameDates.length === 1 ? "person" : "people"} also out
            </p>
          </div>
        )}
      </div>

      {/* Holiday overlap */}
      <div className="glass-card flex flex-col gap-3 p-5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
          Holiday overlap
        </p>
        {impact.holidaysOverlap.length === 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">None</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {impact.holidaysOverlap.map((h) => (
              <div key={h.date} className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-text-secondary">{h.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                  {formatDate(h.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   Approval Journey Timeline
   ========================================================================= */

function ApprovalJourneyTimeline({
  steps,
  currentStep,
  timeoutInfo,
  canApprove,
  canReject,
  actionPending,
  onApprove,
  onReject,
}: {
  readonly steps: readonly ApprovalStep[];
  readonly currentStep: number | null;
  readonly timeoutInfo: LeaveRequest["timeoutInfo"];
  readonly canApprove: boolean;
  readonly canReject: boolean;
  readonly actionPending: boolean;
  readonly onApprove: () => void;
  readonly onReject: () => void;
}): React.ReactElement {
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="glass-card flex flex-col gap-0 p-6">
      <h2 className="mb-6 font-display text-base font-semibold text-text-primary">
        Approval Journey
      </h2>

      {/* Timeline */}
      <ol className="relative flex flex-col gap-0" aria-label="Approval steps">
        {steps.map((step, i) => {
          const isActive = step.stepNumber === currentStep;
          const isCompleted =
            step.status === "approved" ||
            step.status === "skipped" ||
            step.status === "escalated";
          const isRejected = step.status === "rejected";
          const isFuture = !isActive && !isCompleted && !isRejected;

          const isLast = i === steps.length - 1;

          return (
            <li
              key={step.stepNumber}
              className={cn(
                "relative flex items-start gap-4 pb-6",
                isLast && "pb-0"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              {/* Vertical connector line */}
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[19px] top-8 w-px",
                    "bottom-0",
                    isCompleted
                      ? "bg-gradient-to-b from-accent-emerald/60 to-accent-indigo/20"
                      : "bg-white/8"
                  )}
                  aria-hidden="true"
                />
              )}

              {/* Step dot / icon */}
              <div className="relative z-10 shrink-0">
                {isCompleted && !isRejected ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-emerald/40 bg-accent-emerald/20">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-4 w-4 text-accent-emerald"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 8l4 4 6-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                ) : isRejected ? (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-rose/40 bg-accent-rose/20">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-4 w-4 text-accent-rose"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4l8 8M12 4l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-accent-indigo/60 bg-accent-indigo/20">
                    {/* Pulsing ring */}
                    <span
                      className="absolute inset-0 rounded-full border-2 border-accent-indigo/40 animate-ping"
                      aria-hidden="true"
                    />
                    <span className="h-3 w-3 rounded-full bg-accent-indigo" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="h-4 w-4 text-text-tertiary"
                      aria-hidden="true"
                    >
                      <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Step content */}
              <div
                className={cn(
                  "flex-1 rounded-xl border p-4 transition-all duration-400",
                  isActive
                    ? "border-accent-indigo/30 bg-accent-indigo/5"
                    : isCompleted
                    ? "border-accent-emerald/15 bg-white/2"
                    : isRejected
                    ? "border-accent-rose/20 bg-accent-rose/5"
                    : "border-white/5 bg-white/2 opacity-50"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {/* Approver avatar */}
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold"
                      style={{
                        backgroundColor: `${step.approverColor}20`,
                        color: step.approverColor,
                      }}
                      aria-hidden="true"
                    >
                      {step.approverInitials}
                    </div>
                    <div>
                      <p className={cn(
                        "text-sm font-medium",
                        isFuture ? "text-text-tertiary" : "text-text-primary"
                      )}>
                        {step.approverName}
                      </p>
                      <p className="font-mono text-[10px] text-text-tertiary">
                        {step.approverRole}
                        {step.via && ` · via ${step.via}`}
                      </p>
                    </div>
                  </div>

                  {/* Timestamp */}
                  {step.timestamp && (
                    <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                      {formatDateTime(step.timestamp)}
                    </span>
                  )}

                  {/* Active shimmer badge */}
                  {isActive && (
                    <span className="shimmer rounded-full border border-accent-amber/30 bg-accent-amber/10 px-2.5 py-0.5 font-mono text-[10px] text-accent-amber">
                      Awaiting
                    </span>
                  )}
                </div>

                {/* Comment */}
                {step.comment && (
                  <div className="mt-3 rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                    <p className="text-xs text-text-secondary italic">
                      &ldquo;{step.comment}&rdquo;
                    </p>
                  </div>
                )}

                {/* Active step: timeout + action buttons */}
                {isActive && (
                  <div className="mt-4 flex flex-col gap-3">
                    {/* Timeout countdown */}
                    {timeoutInfo && (
                      <div className="flex items-center gap-1.5 font-mono text-xs text-accent-amber">
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        >
                          <circle cx="8" cy="9" r="5" stroke="currentColor" strokeWidth="1.25" />
                          <path d="M8 7v3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                          <path d="M6 2h4M8 2v2" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                        </svg>
                        <span>
                          {formatTimeout(
                            timeoutInfo.hoursRemaining,
                            timeoutInfo.minutesRemaining
                          )}{" "}
                          until escalation
                        </span>
                      </div>
                    )}

                    {/* Approve / Reject actions */}
                    {(canApprove || canReject) && (
                      <div className="flex flex-col gap-2">
                        {!showRejectForm ? (
                          <div className="flex gap-2">
                            {canApprove && (
                              <button
                                type="button"
                                onClick={onApprove}
                                disabled={actionPending}
                                className="flex items-center gap-1.5 rounded-xl bg-accent-emerald/20 px-4 py-2 text-sm font-semibold text-accent-emerald transition-all duration-400 hover:bg-accent-emerald/30 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                                  <path d="M3 8l4 4 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                Approve
                              </button>
                            )}
                            {canReject && (
                              <button
                                type="button"
                                onClick={() => setShowRejectForm(true)}
                                disabled={actionPending}
                                className="flex items-center gap-1.5 rounded-xl bg-accent-rose/20 px-4 py-2 text-sm font-semibold text-accent-rose transition-all duration-400 hover:bg-accent-rose/30 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                Reject
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Provide a reason for rejection..."
                              aria-label="Rejection reason"
                              rows={2}
                              className="w-full resize-none rounded-xl border border-accent-rose/30 bg-accent-rose/5 px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-accent-rose/60 focus:outline-none"
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  if (rejectReason.trim()) onReject(rejectReason);
                                }}
                                disabled={actionPending || !rejectReason.trim()}
                                className="rounded-xl bg-accent-rose/20 px-4 py-2 text-sm font-semibold text-accent-rose transition-all duration-400 hover:bg-accent-rose/30 disabled:opacity-50"
                              >
                                Confirm rejection
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowRejectForm(false);
                                  setRejectReason("");
                                }}
                                className="rounded-xl px-4 py-2 text-sm text-text-tertiary hover:text-text-secondary"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* =========================================================================
   Audit trail
   ========================================================================= */

const AUDIT_ACTION_STYLES: Record<string, { color: string; bg: string }> = {
  CREATE: { color: "#818CF8", bg: "bg-accent-indigo/15" },
  VALIDATE: { color: "#22D3EE", bg: "bg-accent-cyan/15" },
  NOTIFY: { color: "#A78BFA", bg: "bg-accent-violet/15" },
  APPROVE: { color: "#34D399", bg: "bg-accent-emerald/15" },
  REJECT: { color: "#FB7185", bg: "bg-accent-rose/15" },
  CANCEL: { color: "#6B7280", bg: "bg-white/8" },
  ESCALATE: { color: "#FBBF24", bg: "bg-accent-amber/15" },
  FORCE_APPROVE: { color: "#34D399", bg: "bg-accent-emerald/15" },
};

function AuditTrail({
  entries,
}: {
  readonly entries: readonly AuditEntry[];
}): React.ReactElement {
  return (
    <div className="glass-card flex flex-col gap-4 p-6">
      <h2 className="font-display text-base font-semibold text-text-primary">
        Audit Trail
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-text-tertiary">No audit entries yet.</p>
      ) : (
        <ol className="flex flex-col gap-0" aria-label="Audit trail">
          {entries.map((entry, i) => {
            const style = AUDIT_ACTION_STYLES[entry.action] ?? {
              color: "#9CA3AF",
              bg: "bg-white/8",
            };
            return (
              <li
                key={entry.id}
                className={cn(
                  "flex items-start gap-3 py-3",
                  i < entries.length - 1 && "border-b border-white/5"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold",
                    style.bg
                  )}
                  style={{ color: style.color }}
                  aria-label={entry.action}
                >
                  {entry.action}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">
                    {entry.actorName}
                    {entry.details && (
                      <span className="ml-1 text-text-secondary">
                        — {entry.details}
                      </span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-text-tertiary">
                  {formatDateTime(entry.timestamp)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/* =========================================================================
   Action bar
   ========================================================================= */

function ActionBar({
  request,
  actionPending,
  actionError,
  onCancel,
  onForceApprove,
}: {
  readonly request: LeaveRequest;
  readonly actionPending: boolean;
  readonly actionError: string | null;
  readonly onCancel: () => void;
  readonly onForceApprove: () => void;
}): React.ReactElement | null {
  if (!request.canCancel && !request.canForceApprove) return null;

  return (
    <div className="flex flex-col gap-3">
      {actionError && (
        <p className="rounded-xl border border-accent-rose/20 bg-accent-rose/5 px-4 py-3 text-sm text-accent-rose" role="alert">
          {actionError}
        </p>
      )}
      <div className="flex items-center gap-3">
        {request.canCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={actionPending}
            className="rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-2.5 text-sm font-semibold text-accent-rose transition-all duration-400 hover:bg-accent-rose/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel request
          </button>
        )}
        {request.canForceApprove && (
          <button
            type="button"
            onClick={onForceApprove}
            disabled={actionPending}
            className="rounded-xl border border-accent-amber/30 bg-accent-amber/10 px-4 py-2.5 text-sm font-semibold text-accent-amber transition-all duration-400 hover:bg-accent-amber/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Force approve
          </button>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function LeaveRequestDetailPage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const requestId = typeof params["id"] === "string" ? params["id"] : "";

  const { state, approve, reject, cancel, forceApprove } = useLeaveRequest(requestId);

  if (state.loading) {
    return (
      <div className="flex flex-col gap-6 overflow-y-auto p-6 animate-fade-in">
        <div className="shimmer h-32 rounded-2xl" aria-busy="true" aria-label="Loading request" />
        <div className="shimmer h-24 rounded-2xl" />
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }

  if (state.error || !state.request) {
    return (
      <div className="flex flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-accent-rose/20 bg-accent-rose/5 p-10 text-center">
          <p className="text-sm text-accent-rose">
            {state.error ?? "Request not found."}
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-white/8 px-4 py-2 text-sm font-semibold text-text-secondary transition-all duration-400 hover:bg-white/12"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const request = state.request;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 overflow-y-auto p-6 scrollbar-none animate-slide-up">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.back()}
        className="flex w-fit items-center gap-1.5 font-mono text-xs text-text-tertiary transition-colors hover:text-text-secondary"
        aria-label="Go back"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
          <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      {/* Header */}
      <RequestHeader request={request} />

      {/* Impact grid */}
      <ImpactGrid request={request} />

      {/* Approval Journey Timeline */}
      {request.approvalSteps.length > 0 && (
        <ApprovalJourneyTimeline
          steps={request.approvalSteps}
          currentStep={request.currentStep}
          timeoutInfo={request.timeoutInfo}
          canApprove={request.canApprove}
          canReject={request.canReject}
          actionPending={state.actionPending}
          onApprove={() => void approve()}
          onReject={(reason) => void reject(reason)}
        />
      )}

      {/* Action bar (Cancel / Force Approve) */}
      <ActionBar
        request={request}
        actionPending={state.actionPending}
        actionError={state.actionError}
        onCancel={() => void cancel()}
        onForceApprove={() => void forceApprove()}
      />

      {/* Audit trail */}
      <AuditTrail entries={request.auditTrail} />
    </div>
  );
}
