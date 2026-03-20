"use client";

/**
 * TemplateSelector — three template cards for quick workflow setup.
 *
 * Displays Simple, Standard, and Enterprise templates with descriptions
 * and step previews. Calls onSelect when a template card is clicked.
 */

import { cn } from "@/lib/utils";
import {
  TEMPLATE_PRESETS,
  type WorkflowTemplate,
} from "@/stores/workflow-builder.store";

/* =========================================================================
   Template metadata
   ========================================================================= */

const TEMPLATE_META: Record<
  Exclude<WorkflowTemplate, null>,
  {
    readonly description: string;
    readonly icon: string;
    readonly badge: string;
    readonly badgeColor: string;
  }
> = {
  simple: {
    description:
      "Single manager approval. Best for small teams or low-risk leave types.",
    icon: "⚡",
    badge: "1 step",
    badgeColor: "bg-accent-emerald/10 text-accent-emerald",
  },
  standard: {
    description:
      "Manager approval followed by HR review. Standard for most companies.",
    icon: "✦",
    badge: "2 steps",
    badgeColor: "bg-accent-indigo/10 text-accent-indigo",
  },
  enterprise: {
    description:
      "Three-tier approval: manager, department head, and HR. Full audit trail.",
    icon: "◈",
    badge: "3 steps",
    badgeColor: "bg-accent-violet/10 text-accent-violet",
  },
};

/* =========================================================================
   Props
   ========================================================================= */

interface TemplateSelectorProps {
  readonly selected: WorkflowTemplate;
  readonly onSelect: (template: Exclude<WorkflowTemplate, null>) => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function TemplateSelector({ selected, onSelect }: TemplateSelectorProps) {
  return (
    <div>
      <h3 className="mb-3 font-display text-sm font-semibold text-text-secondary uppercase tracking-wider">
        Quick-start Templates
      </h3>
      <div className="grid gap-3 sm:grid-cols-3">
        {(["simple", "standard", "enterprise"] as const).map((key) => (
          <TemplateCard
            key={key}
            templateKey={key}
            isSelected={selected === key}
            onSelect={() => onSelect(key)}
          />
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   TemplateCard
   ========================================================================= */

function TemplateCard({
  templateKey,
  isSelected,
  onSelect,
}: {
  readonly templateKey: Exclude<WorkflowTemplate, null>;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}) {
  const meta = TEMPLATE_META[templateKey];
  const preset = TEMPLATE_PRESETS[templateKey];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all",
        isSelected
          ? "border-accent-indigo/50 bg-accent-indigo/5 ring-1 ring-accent-indigo/20"
          : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5"
      )}
      aria-pressed={isSelected}
    >
      {/* Icon + badge row */}
      <div className="flex items-center justify-between">
        <span className="text-xl" role="img" aria-hidden="true">
          {meta.icon}
        </span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 font-mono text-xs font-semibold",
            meta.badgeColor
          )}
        >
          {meta.badge}
        </span>
      </div>

      {/* Name */}
      <div>
        <p
          className={cn(
            "font-display text-sm font-semibold",
            isSelected ? "text-accent-indigo" : "text-text-primary"
          )}
        >
          {preset.name}
        </p>
        <p className="mt-1 text-xs text-text-secondary">{meta.description}</p>
      </div>

      {/* Step mini-preview */}
      <div className="flex flex-col gap-1">
        {preset.steps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1"
          >
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent-indigo/20 font-mono text-[10px] text-accent-indigo">
              {idx + 1}
            </span>
            <span className="truncate text-xs text-text-secondary">
              {step.approverLabel}
            </span>
          </div>
        ))}
      </div>
    </button>
  );
}
