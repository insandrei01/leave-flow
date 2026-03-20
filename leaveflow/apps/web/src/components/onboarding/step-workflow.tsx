"use client";

/**
 * StepWorkflow — Step 3: Workflow template selection.
 *
 * Three template cards (Simple / Standard / Enterprise) with mini flow previews.
 */

import { cn } from "@/lib/utils";
import type { OnboardingData, WorkflowTemplate } from "@/hooks/use-onboarding";

/* =========================================================================
   Types & constants
   ========================================================================= */

interface TemplateOption {
  readonly id: WorkflowTemplate;
  readonly title: string;
  readonly description: string;
  readonly steps: readonly { label: string; color: string }[];
  readonly recommended?: boolean;
}

const TEMPLATES: readonly TemplateOption[] = [
  {
    id: "simple",
    title: "Simple",
    description:
      "One-step approval by direct manager. Best for small teams or low-friction cultures.",
    steps: [
      { label: "Submit", color: "#818CF8" },
      { label: "Manager", color: "#A78BFA" },
      { label: "Approved", color: "#34D399" },
    ],
  },
  {
    id: "standard",
    title: "Standard",
    recommended: true,
    description:
      "Manager approval followed by HR review. Most common for 10–200 person companies.",
    steps: [
      { label: "Submit", color: "#818CF8" },
      { label: "Manager", color: "#A78BFA" },
      { label: "HR", color: "#FBBF24" },
      { label: "Approved", color: "#34D399" },
    ],
  },
  {
    id: "enterprise",
    title: "Enterprise",
    description:
      "Multi-level chain: manager → department head → HR. Suitable for compliance-heavy organizations.",
    steps: [
      { label: "Submit", color: "#818CF8" },
      { label: "Manager", color: "#A78BFA" },
      { label: "Dept Head", color: "#22D3EE" },
      { label: "HR", color: "#FBBF24" },
      { label: "Approved", color: "#34D399" },
    ],
  },
];

/* =========================================================================
   Mini flow preview
   ========================================================================= */

function MiniFlowPreview({
  steps,
}: {
  readonly steps: readonly { label: string; color: string }[];
}): React.ReactElement {
  return (
    <div
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none"
      aria-hidden="true"
    >
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-1.5">
          {/* Node */}
          <div
            className="flex h-7 min-w-max items-center justify-center rounded-full px-2.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${step.color}20`,
              color: step.color,
              border: `1px solid ${step.color}40`,
            }}
          >
            {step.label}
          </div>

          {/* Connector */}
          {i < steps.length - 1 && (
            <svg
              viewBox="0 0 12 8"
              fill="none"
              className="h-2 w-3 shrink-0 text-text-tertiary"
            >
              <path
                d="M1 4h8M7 1l3 3-3 3"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   Template card
   ========================================================================= */

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  readonly template: TemplateOption;
  readonly selected: boolean;
  readonly onSelect: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border p-5 text-left transition-all duration-400",
        selected
          ? "border-accent-indigo/60 bg-accent-indigo/10 shadow-[0_0_16px_rgba(129,140,248,0.2)]"
          : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"
      )}
    >
      {/* Recommended badge */}
      {template.recommended && (
        <div className="absolute right-4 top-4 rounded-full border border-accent-amber/40 bg-accent-amber/20 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-accent-amber">
          Recommended
        </div>
      )}

      {/* Selected indicator */}
      <div
        className={cn(
          "absolute left-4 top-4 h-4 w-4 rounded-full border-2 transition-all duration-400",
          selected
            ? "border-accent-indigo bg-accent-indigo"
            : "border-white/20 bg-transparent"
        )}
        aria-hidden="true"
      >
        {selected && (
          <svg
            viewBox="0 0 12 12"
            fill="none"
            className="absolute inset-0 m-auto h-2.5 w-2.5"
            aria-hidden="true"
          >
            <path
              d="M2 6l3 3 5-5"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Title */}
      <div className="pl-7">
        <h3 className="font-display text-base font-semibold text-text-primary">
          {template.title}
        </h3>
        <p className="mt-1 text-sm text-text-secondary">{template.description}</p>
      </div>

      {/* Mini flow */}
      <div className="rounded-xl border border-white/5 bg-black/20 p-3">
        <MiniFlowPreview steps={template.steps} />
      </div>

      {/* Step count */}
      <p className="font-mono text-[11px] text-text-tertiary">
        {template.steps.length - 2} approval{" "}
        {template.steps.length - 2 === 1 ? "step" : "steps"}
      </p>
    </button>
  );
}

/* =========================================================================
   Main component
   ========================================================================= */

interface StepWorkflowProps {
  readonly data: OnboardingData;
  readonly onChange: (patch: Partial<OnboardingData>) => void;
}

export function StepWorkflow({
  data,
  onChange,
}: StepWorkflowProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-semibold text-text-primary">
          Choose an approval workflow
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Select a template that matches how your company handles leave
          approvals. You can customize it after setup.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {TEMPLATES.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            selected={data.workflowTemplate === template.id}
            onSelect={() => onChange({ workflowTemplate: template.id })}
          />
        ))}
      </div>

      {data.workflowTemplate && (
        <p className="flex items-center gap-2 text-sm text-text-secondary animate-fade-in">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className="h-4 w-4 text-accent-emerald"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M5.5 8l2 2 3-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Selected:{" "}
          <span className="font-medium text-text-primary capitalize">
            {data.workflowTemplate}
          </span>{" "}
          workflow
        </p>
      )}
    </div>
  );
}
