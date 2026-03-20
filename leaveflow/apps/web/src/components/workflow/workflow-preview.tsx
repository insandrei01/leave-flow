"use client";

/**
 * WorkflowPreview — live visual flow diagram for the workflow builder.
 *
 * Renders a vertical node-based diagram that updates in real-time
 * as the workflow steps change. No external graph library needed —
 * uses SVG connectors and CSS layout.
 */

import { cn } from "@/lib/utils";
import type { WorkflowStep, TimeoutAction } from "@/stores/workflow-builder.store";
import { COLORS } from "@/styles/design-tokens";

/* =========================================================================
   Props
   ========================================================================= */

interface WorkflowPreviewProps {
  readonly steps: readonly WorkflowStep[];
  readonly workflowName: string;
}

/* =========================================================================
   Constants
   ========================================================================= */

const TIMEOUT_ACTION_ICONS: Record<TimeoutAction, string> = {
  remind: "🔔",
  escalate: "⬆️",
  "auto-approve": "✓",
  "notify-hr": "📢",
};

const TIMEOUT_ACTION_COLORS: Record<TimeoutAction, string> = {
  remind: "text-accent-amber",
  escalate: "text-accent-violet",
  "auto-approve": "text-accent-emerald",
  "notify-hr": "text-accent-cyan",
};

/* =========================================================================
   Resolution time estimate
   ========================================================================= */

function estimateResolutionHours(steps: readonly WorkflowStep[]): number {
  return steps.reduce((total, step) => total + step.timeoutHours, 0);
}

function formatDuration(hours: number): string {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainder = hours % 24;
  return remainder > 0 ? `${days}d ${remainder}h` : `${days}d`;
}

/* =========================================================================
   Component
   ========================================================================= */

export function WorkflowPreview({ steps, workflowName }: WorkflowPreviewProps) {
  const estimatedHours = estimateResolutionHours(steps);

  return (
    <div className="glass-card flex h-full flex-col p-5">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-text-primary">
          Live Preview
        </h3>
        {steps.length > 0 && (
          <span className="rounded-full bg-accent-indigo/10 px-2 py-0.5 font-mono text-xs text-accent-indigo">
            ~{formatDuration(estimatedHours)}
          </span>
        )}
      </div>

      {/* Workflow name */}
      <p className="mb-4 truncate font-display text-base font-semibold text-text-primary">
        {workflowName}
      </p>

      {/* Flow diagram */}
      <div
        className="scrollbar-none flex-1 overflow-y-auto"
        role="img"
        aria-label={`Workflow preview: ${workflowName} with ${steps.length} steps`}
      >
        <div className="flex flex-col items-center gap-0">
          {/* Start node */}
          <PreviewNode
            variant="terminal"
            color="emerald"
            label="Start"
            sublabel="Request submitted"
          />

          {steps.length === 0 ? (
            <>
              <Connector />
              <div className="rounded-xl border border-dashed border-white/10 px-4 py-3 text-center">
                <p className="text-xs text-text-tertiary">
                  No steps — add steps to see flow
                </p>
              </div>
              <Connector />
            </>
          ) : (
            steps.map((step, index) => (
              <div key={step.id} className="flex w-full flex-col items-center">
                <Connector />
                <PreviewStepNode
                  step={step}
                  stepNumber={index + 1}
                />
              </div>
            ))
          )}

          <Connector />

          {/* End node */}
          <PreviewNode
            variant="terminal"
            color="emerald"
            label="End"
            sublabel="Decision reached"
          />
        </div>
      </div>

      {/* Resolution estimate */}
      {steps.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">
              Estimated max resolution time
            </p>
            <p className="font-mono text-sm font-semibold text-accent-indigo">
              {formatDuration(estimatedHours)}
            </p>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-indigo to-accent-violet transition-all duration-500"
              style={{
                width: `${Math.min(100, (steps.length / 5) * 100)}%`,
              }}
            />
          </div>
          <p className="mt-1.5 text-xs text-text-tertiary">
            {steps.length} step{steps.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/* =========================================================================
   Sub-components
   ========================================================================= */

function Connector() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-4 w-px bg-gradient-to-b from-white/15 to-white/25" />
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        className="text-white/20"
        aria-hidden="true"
      >
        <path d="M4 5L0 0H8L4 5Z" fill="currentColor" />
      </svg>
    </div>
  );
}

function PreviewNode({
  variant,
  color,
  label,
  sublabel,
}: {
  readonly variant: "terminal" | "step";
  readonly color: "emerald" | "indigo" | "violet";
  readonly label: string;
  readonly sublabel: string;
}) {
  const colorClasses: Record<string, string> = {
    emerald: "border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald",
    indigo: "border-accent-indigo/30 bg-accent-indigo/10 text-accent-indigo",
    violet: "border-accent-violet/30 bg-accent-violet/10 text-accent-violet",
  };

  const ringColor = colorClasses[color] ?? colorClasses["emerald"];

  return (
    <div
      className={cn(
        "w-full rounded-xl border px-3 py-2.5 text-center",
        variant === "terminal"
          ? "border-dashed"
          : "border-solid",
        ringColor
      )}
    >
      <p className="text-xs font-semibold">{label}</p>
      <p
        className="text-xs"
        style={{ color: COLORS.text.secondary }}
      >
        {sublabel}
      </p>
    </div>
  );
}

function PreviewStepNode({
  step,
  stepNumber,
}: {
  readonly step: WorkflowStep;
  readonly stepNumber: number;
}) {
  const color = stepNumber % 2 === 0 ? "violet" : "indigo";

  return (
    <div
      className={cn(
        "w-full rounded-xl border px-3 py-2.5",
        color === "indigo"
          ? "border-accent-indigo/30 bg-accent-indigo/10"
          : "border-accent-violet/30 bg-accent-violet/10"
      )}
    >
      {/* Step number + type */}
      <div className="mb-1 flex items-center gap-1.5">
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full font-mono text-xs font-bold",
            color === "indigo"
              ? "bg-accent-indigo/20 text-accent-indigo"
              : "bg-accent-violet/20 text-accent-violet"
          )}
        >
          {stepNumber}
        </span>
        <span className="text-xs font-semibold text-text-primary">
          {step.approverLabel || "Approver not set"}
        </span>
      </div>

      {/* Details row */}
      <div className="flex items-center gap-2 text-xs text-text-secondary">
        <span>{step.approverType}</span>
        <span className="text-white/20">·</span>
        <span>{step.timeoutHours}h timeout</span>
        <span className="text-white/20">·</span>
        <span className={TIMEOUT_ACTION_COLORS[step.timeoutAction]}>
          {TIMEOUT_ACTION_ICONS[step.timeoutAction]}
        </span>
      </div>

      {step.allowDelegation && (
        <p className="mt-1 text-xs text-text-tertiary">Delegation allowed</p>
      )}
    </div>
  );
}
