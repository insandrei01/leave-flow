/**
 * JourneyStep — individual step in the approval journey timeline.
 *
 * States:
 *   completed — green checkmark, grayed connector
 *   active    — pulsing indigo dot, expanded details
 *   future    — dimmed, static connector
 */

import { cn } from "@/lib/utils";
import { PulseDot } from "./pulse-dot";

/* =========================================================================
   Types
   ========================================================================= */

export type JourneyStepState = "completed" | "active" | "future";

export interface JourneyStepData {
  readonly id: string;
  readonly state: JourneyStepState;
  readonly title: string;
  readonly approverName?: string;
  readonly approverRole?: string;
  readonly timestamp?: string;
  readonly action?: string;
  readonly timeoutSecondsRemaining?: number;
  readonly comment?: string;
}

export interface JourneyStepProps {
  readonly step: JourneyStepData;
  readonly isLast: boolean;
}

/* =========================================================================
   Helpers
   ========================================================================= */

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function formatCountdown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

/* =========================================================================
   Step dot
   ========================================================================= */

function StepDot({ state }: { readonly state: JourneyStepState }) {
  if (state === "completed") {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent-emerald/20 ring-2 ring-accent-emerald">
        <svg
          aria-hidden="true"
          className="h-4 w-4 text-accent-emerald"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }

  if (state === "active") {
    return (
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center">
        <PulseDot color="indigo" size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-border-glass bg-surface-glass opacity-40">
      <span className="h-2 w-2 rounded-full bg-text-tertiary" />
    </div>
  );
}

/* =========================================================================
   Component
   ========================================================================= */

export function JourneyStep({ step, isLast }: JourneyStepProps) {
  const {
    state,
    title,
    approverName,
    approverRole,
    timestamp,
    action,
    timeoutSecondsRemaining,
    comment,
  } = step;

  return (
    <div className="relative flex gap-4" role="listitem">
      {/* Dot + connector column */}
      <div className="flex flex-col items-center">
        <StepDot state={state} />
        {!isLast && (
          <div
            className={cn(
              "mt-1 w-0.5 flex-1",
              state === "completed" ? "bg-accent-emerald/40" : "bg-border-glass"
            )}
            style={{ minHeight: 32 }}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-6", isLast && "pb-0")}>
        {/* Title + action badge */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "text-sm font-medium",
              state === "completed" && "text-accent-emerald",
              state === "active" && "text-text-primary",
              state === "future" && "text-text-tertiary opacity-50"
            )}
          >
            {title}
          </span>

          {action && (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 font-mono text-[10px] font-medium",
                state === "completed" &&
                  "bg-accent-emerald/15 text-accent-emerald",
                state === "active" &&
                  "shimmer bg-accent-amber/15 text-accent-amber",
                state === "future" && "bg-white/5 text-text-tertiary opacity-50"
              )}
            >
              {action}
            </span>
          )}
        </div>

        {/* Approver + timestamp */}
        {(approverName ?? timestamp) && (
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
            {approverName && (
              <span>
                {approverName}
                {approverRole && (
                  <span className="ml-1 opacity-70">· {approverRole}</span>
                )}
              </span>
            )}
            {timestamp && (
              <span className="font-mono">{formatTimestamp(timestamp)}</span>
            )}
          </div>
        )}

        {/* Comment */}
        {comment && (
          <p className="mt-1.5 rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-xs text-text-secondary italic">
            "{comment}"
          </p>
        )}

        {/* Timeout countdown */}
        {state === "active" && timeoutSecondsRemaining !== undefined && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-accent-amber">
            <svg
              aria-hidden="true"
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Escalates in {formatCountdown(timeoutSecondsRemaining)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
