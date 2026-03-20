"use client";

/**
 * WorkflowStepList — ordered list of workflow step forms with visual connectors.
 *
 * Uses CSS order (not a drag-and-drop library) for reordering.
 * Renders trigger and end nodes with connecting lines between steps.
 */

import { cn } from "@/lib/utils";
import type { WorkflowStep } from "@/stores/workflow-builder.store";
import { WorkflowStepForm } from "./workflow-step-form";

/* =========================================================================
   Props
   ========================================================================= */

interface WorkflowStepListProps {
  readonly steps: readonly WorkflowStep[];
  readonly onUpdateStep: (
    stepId: string,
    patch: Partial<Omit<WorkflowStep, "id">>
  ) => void;
  readonly onMoveStepUp: (stepId: string) => void;
  readonly onMoveStepDown: (stepId: string) => void;
  readonly onRemoveStep: (stepId: string) => void;
  readonly onAddStep: () => void;
}

/* =========================================================================
   Component
   ========================================================================= */

export function WorkflowStepList({
  steps,
  onUpdateStep,
  onMoveStepUp,
  onMoveStepDown,
  onRemoveStep,
  onAddStep,
}: WorkflowStepListProps) {
  return (
    <div className="flex flex-col gap-0">
      {/* Trigger node */}
      <TriggerNode />

      {/* Step connector */}
      <StepConnector />

      {/* Steps */}
      {steps.length === 0 ? (
        <EmptyStepsPrompt onAddStep={onAddStep} />
      ) : (
        steps.map((step, index) => (
          <div key={step.id} className="flex flex-col">
            <WorkflowStepForm
              step={step}
              stepNumber={index + 1}
              isFirst={index === 0}
              isLast={index === steps.length - 1}
              onUpdate={(patch) => onUpdateStep(step.id, patch)}
              onMoveUp={() => onMoveStepUp(step.id)}
              onMoveDown={() => onMoveStepDown(step.id)}
              onRemove={() => onRemoveStep(step.id)}
            />
            <StepConnector />
          </div>
        ))
      )}

      {/* Add step button */}
      {steps.length > 0 && (
        <>
          <AddStepButton onClick={onAddStep} />
          <StepConnector />
        </>
      )}

      {/* End node */}
      <EndNode />
    </div>
  );
}

/* =========================================================================
   Sub-components
   ========================================================================= */

function TriggerNode() {
  return (
    <div className="glass-card flex items-center gap-3 border-l-4 border-l-accent-emerald p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-emerald/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-4 w-4 text-accent-emerald"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.15-.043l4.25-5.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">
          Leave Request Submitted
        </p>
        <p className="text-xs text-text-secondary">
          Triggers when an employee submits a leave request
        </p>
      </div>
    </div>
  );
}

function EndNode() {
  return (
    <div className="glass-card flex items-center gap-3 border-l-4 border-l-accent-emerald p-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-emerald/20">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="h-4 w-4 text-accent-emerald"
          aria-hidden="true"
        >
          <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path
            fillRule="evenodd"
            d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0-1.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">
          Final Decision
        </p>
        <p className="text-xs text-text-secondary">
          Leave approved, rejected, or auto-approved by timeout
        </p>
      </div>
    </div>
  );
}

function StepConnector() {
  return (
    <div className="flex justify-center py-0">
      <div className="h-6 w-px bg-gradient-to-b from-white/10 to-white/20" />
    </div>
  );
}

function AddStepButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/3 px-4 py-3",
        "text-sm font-medium text-text-secondary transition-colors",
        "hover:border-accent-indigo/40 hover:bg-accent-indigo/5 hover:text-accent-indigo"
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
      </svg>
      Add Approval Step
    </button>
  );
}

function EmptyStepsPrompt({ onAddStep }: { readonly onAddStep: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 bg-white/3 p-8 text-center">
      <p className="text-sm font-medium text-text-secondary">
        No approval steps yet
      </p>
      <p className="text-xs text-text-tertiary">
        Add steps or choose a template to get started
      </p>
      <button
        type="button"
        onClick={onAddStep}
        className="rounded-xl bg-accent-indigo/10 px-4 py-2 text-sm font-medium text-accent-indigo transition-colors hover:bg-accent-indigo/20"
      >
        Add First Step
      </button>
    </div>
  );
}
