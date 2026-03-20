"use client";

/**
 * ProgressSidebar — left panel for the onboarding wizard.
 *
 * Shows:
 * - SVG circular progress ring with gradient stroke
 * - Step list (completed/active/future states)
 * - Estimated time remaining
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface OnboardingStep {
  readonly number: number;
  readonly label: string;
  readonly estimatedMinutes: number;
  readonly skippable: boolean;
}

interface ProgressSidebarProps {
  readonly steps: readonly OnboardingStep[];
  readonly currentStep: number;
  readonly completedSteps: readonly number[];
}

/* =========================================================================
   Constants
   ========================================================================= */

const RING_RADIUS = 44;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

/* =========================================================================
   Sub-components
   ========================================================================= */

function ProgressRing({
  percentage,
}: {
  readonly percentage: number;
}): React.ReactElement {
  const offset = RING_CIRCUMFERENCE * (1 - percentage / 100);

  return (
    <div className="relative flex h-28 w-28 items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="h-28 w-28 -rotate-90"
        aria-hidden="true"
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="ring-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
        />

        {/* Progress arc */}
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          stroke="url(#ring-gradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </svg>

      {/* Percentage text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold text-text-primary">
          {Math.round(percentage)}%
        </span>
        <span className="font-mono text-[10px] text-text-tertiary">done</span>
      </div>
    </div>
  );
}

function StepItem({
  step,
  status,
}: {
  readonly step: OnboardingStep;
  readonly status: "completed" | "active" | "future";
}): React.ReactElement {
  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl p-2 transition-colors duration-400",
        status === "active" && "bg-white/5"
      )}
    >
      {/* Step number / check icon */}
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-400",
          status === "completed" &&
            "border-accent-emerald bg-accent-emerald/20 text-accent-emerald",
          status === "active" &&
            "border-accent-indigo bg-accent-indigo/20 text-accent-indigo animate-glow",
          status === "future" &&
            "border-white/10 bg-white/5 text-text-tertiary"
        )}
        aria-hidden="true"
      >
        {status === "completed" ? (
          /* Checkmark SVG */
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          step.number
        )}
      </div>

      {/* Label */}
      <div className="min-w-0 flex-1 pt-0.5">
        <p
          className={cn(
            "text-sm font-medium leading-tight transition-colors duration-400",
            status === "completed" &&
              "text-text-secondary line-through decoration-text-tertiary",
            status === "active" && "text-text-primary",
            status === "future" && "text-text-tertiary"
          )}
        >
          {step.label}
        </p>
        {step.skippable && status !== "completed" && (
          <p className="mt-0.5 font-mono text-[10px] text-text-tertiary">
            Optional
          </p>
        )}
      </div>
    </li>
  );
}

/* =========================================================================
   Main component
   ========================================================================= */

export function ProgressSidebar({
  steps,
  currentStep,
  completedSteps,
}: ProgressSidebarProps): React.ReactElement {
  const completedCount = completedSteps.length;
  const percentage = (completedCount / steps.length) * 100;

  const remainingMinutes = steps
    .filter(
      (s) =>
        !completedSteps.includes(s.number) && s.number !== currentStep
    )
    .reduce((sum, s) => sum + s.estimatedMinutes, 0);

  return (
    <aside
      className="flex w-64 shrink-0 flex-col gap-8 p-6"
      aria-label="Onboarding progress"
    >
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-indigo/20">
          <span className="font-display text-sm font-bold text-accent-indigo">
            LF
          </span>
        </div>
        <span className="font-display text-sm font-semibold text-text-primary">
          LeaveFlow
        </span>
      </div>

      {/* Progress ring */}
      <div className="flex flex-col items-center gap-3">
        <ProgressRing percentage={percentage} />
        <p className="text-center font-mono text-xs text-text-secondary">
          {completedCount} of {steps.length} steps complete
        </p>
      </div>

      {/* Step list */}
      <nav aria-label="Setup steps">
        <ol className="flex flex-col gap-1" role="list">
          {steps.map((step) => {
            const status = completedSteps.includes(step.number)
              ? "completed"
              : step.number === currentStep
              ? "active"
              : "future";
            return (
              <StepItem key={step.number} step={step} status={status} />
            );
          })}
        </ol>
      </nav>

      {/* Estimated time */}
      {remainingMinutes > 0 && (
        <div className="mt-auto rounded-xl border border-white/5 bg-white/3 p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-text-tertiary">
            Est. remaining
          </p>
          <p className="mt-1 font-display text-lg font-semibold text-text-secondary">
            ~{remainingMinutes}
            <span className="ml-1 font-mono text-xs font-normal text-text-tertiary">
              min
            </span>
          </p>
        </div>
      )}
    </aside>
  );
}
