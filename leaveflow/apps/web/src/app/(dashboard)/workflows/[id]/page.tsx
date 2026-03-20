"use client";

/**
 * Workflow builder page — split view with form on left and live preview on right.
 *
 * Supports creating a new workflow (id="new") or editing an existing one.
 * All state is managed via pure functions — no mutation.
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WorkflowStepList } from "@/components/workflow/workflow-step-list";
import { WorkflowPreview } from "@/components/workflow/workflow-preview";
import { TemplateSelector } from "@/components/workflow/template-selector";
import {
  createInitialState,
  addStep,
  removeStep,
  updateStep,
  moveStepUp,
  moveStepDown,
  applyTemplate,
  setWorkflowName,
  markClean,
  type WorkflowBuilderState,
  type WorkflowStep,
  type WorkflowTemplate,
} from "@/stores/workflow-builder.store";
import {
  useWorkflow,
  useCreateWorkflow,
  useUpdateWorkflow,
} from "@/hooks/use-workflow";

/* =========================================================================
   Page
   ========================================================================= */

export default function WorkflowBuilderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id ?? "new";
  const isNew = id === "new";

  const [builderState, setBuilderState] = useState<WorkflowBuilderState>(
    createInitialState()
  );

  const { workflow, isLoading: isLoadingWorkflow } = useWorkflow(
    isNew ? "" : id
  );
  const { create, isCreating, error: createError } = useCreateWorkflow();
  const { update, isUpdating, error: updateError } = useUpdateWorkflow();

  const isSaving = isCreating || isUpdating;
  const saveError = createError ?? updateError;

  // Populate state when editing an existing workflow
  useEffect(() => {
    if (!workflow) return;

    const steps: WorkflowStep[] = workflow.steps.map((s, index) => ({
      id: `loaded-${index}-${Date.now()}`,
      approverType: (s.approverType as WorkflowStep["approverType"]) ?? "role-based",
      approverId: s.approverLabel.toLowerCase().replace(/\s/g, "-"),
      approverLabel: s.approverLabel,
      timeoutHours: s.timeoutHours,
      timeoutAction: (s.timeoutAction as WorkflowStep["timeoutAction"]) ?? "remind",
      allowDelegation: s.allowDelegation,
    }));

    setBuilderState({
      steps,
      selectedTemplate: null,
      isDirty: false,
      workflowName: workflow.name,
    });
  }, [workflow]);

  /* Actions */
  const handleAddStep = useCallback(
    () => setBuilderState((s) => addStep(s)),
    []
  );

  const handleRemoveStep = useCallback(
    (stepId: string) => setBuilderState((s) => removeStep(s, stepId)),
    []
  );

  const handleUpdateStep = useCallback(
    (stepId: string, patch: Partial<Omit<WorkflowStep, "id">>) =>
      setBuilderState((s) => updateStep(s, stepId, patch)),
    []
  );

  const handleMoveUp = useCallback(
    (stepId: string) => setBuilderState((s) => moveStepUp(s, stepId)),
    []
  );

  const handleMoveDown = useCallback(
    (stepId: string) => setBuilderState((s) => moveStepDown(s, stepId)),
    []
  );

  const handleTemplateSelect = useCallback(
    (template: Exclude<WorkflowTemplate, null>) =>
      setBuilderState((s) => applyTemplate(s, template)),
    []
  );

  const handleNameChange = useCallback(
    (name: string) => setBuilderState((s) => setWorkflowName(s, name)),
    []
  );

  const handleSave = useCallback(async () => {
    const payload = {
      name: builderState.workflowName,
      steps: builderState.steps.map((step) => ({
        approverType: step.approverType,
        approverLabel: step.approverLabel,
        timeoutHours: step.timeoutHours,
        timeoutAction: step.timeoutAction,
        allowDelegation: step.allowDelegation,
      })),
    };

    if (isNew) {
      const result = await create(payload);
      if (result) {
        setBuilderState((s) => markClean(s));
        router.push(`/workflows/${result.id}`);
      }
    } else {
      const result = await update(id, payload);
      if (result) {
        setBuilderState((s) => markClean(s));
      }
    }
  }, [builderState, isNew, create, update, id, router]);

  /* Loading skeleton */
  if (!isNew && isLoadingWorkflow) {
    return (
      <div className="min-h-screen p-6" aria-busy="true" aria-label="Loading workflow">
        <div className="shimmer mb-6 h-10 w-48 rounded-xl" />
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            <div className="shimmer h-96 rounded-2xl" />
          </div>
          <div className="shimmer h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/workflows"
          className="rounded-lg p-2 text-text-secondary transition-colors hover:bg-white/10 hover:text-text-primary"
          aria-label="Back to workflows"
        >
          <BackIcon />
        </Link>
        <div className="flex flex-1 items-center gap-3">
          <input
            type="text"
            value={builderState.workflowName}
            onChange={(e) => handleNameChange(e.target.value)}
            aria-label="Workflow name"
            className="min-w-0 flex-1 bg-transparent font-display text-2xl font-bold text-text-primary focus:outline-none"
            placeholder="Workflow name…"
          />
          {builderState.isDirty && (
            <span className="rounded-full bg-accent-amber/10 px-2 py-0.5 font-mono text-xs text-accent-amber">
              Unsaved
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !builderState.isDirty}
          className={cn(
            "rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
            builderState.isDirty && !isSaving
              ? "bg-accent-indigo text-white hover:bg-accent-indigo/90"
              : "cursor-not-allowed bg-white/10 text-text-tertiary"
          )}
        >
          {isSaving ? "Saving…" : isNew ? "Create Workflow" : "Save Changes"}
        </button>
      </div>

      {/* Save error */}
      {saveError && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-accent-rose/30 bg-accent-rose/10 px-4 py-3 text-sm text-accent-rose"
        >
          {saveError}
        </div>
      )}

      {/* Template selector */}
      <div className="mb-6">
        <TemplateSelector
          selected={builderState.selectedTemplate}
          onSelect={handleTemplateSelect}
        />
      </div>

      {/* Split view */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left: step form (2/3) */}
        <div className="col-span-2">
          <WorkflowStepList
            steps={builderState.steps}
            onUpdateStep={handleUpdateStep}
            onMoveStepUp={handleMoveUp}
            onMoveStepDown={handleMoveDown}
            onRemoveStep={handleRemoveStep}
            onAddStep={handleAddStep}
          />
        </div>

        {/* Right: live preview (1/3) */}
        <div className="col-span-1">
          <div className="sticky top-6">
            <WorkflowPreview
              steps={builderState.steps}
              workflowName={builderState.workflowName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Icons
   ========================================================================= */

function BackIcon() {
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
        d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
