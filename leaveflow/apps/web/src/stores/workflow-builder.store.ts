/**
 * Workflow Builder Store — Zustand state for the workflow step editor.
 *
 * Manages the ordered list of workflow steps, selected template,
 * and dirty state tracking. All state mutations return new objects
 * (immutable pattern).
 */

/* =========================================================================
   Types
   ========================================================================= */

export type ApproverType = "role-based" | "specific" | "group";

export type TimeoutAction =
  | "remind"
  | "escalate"
  | "auto-approve"
  | "notify-hr";

export type WorkflowTemplate = "simple" | "standard" | "enterprise" | null;

export interface WorkflowStep {
  readonly id: string;
  readonly approverType: ApproverType;
  /** ID or identifier of the selected approver (role, user, group) */
  readonly approverId: string;
  readonly approverLabel: string;
  readonly timeoutHours: number;
  readonly timeoutAction: TimeoutAction;
  readonly allowDelegation: boolean;
}

export interface WorkflowBuilderState {
  readonly steps: readonly WorkflowStep[];
  readonly selectedTemplate: WorkflowTemplate;
  readonly isDirty: boolean;
  readonly workflowName: string;
}

/* =========================================================================
   Default values
   ========================================================================= */

const DEFAULT_STEP: Omit<WorkflowStep, "id"> = {
  approverType: "role-based",
  approverId: "",
  approverLabel: "",
  timeoutHours: 24,
  timeoutAction: "remind",
  allowDelegation: true,
};

export const TEMPLATE_PRESETS: Record<
  Exclude<WorkflowTemplate, null>,
  { readonly name: string; readonly steps: readonly Omit<WorkflowStep, "id">[] }
> = {
  simple: {
    name: "Simple Approval",
    steps: [
      {
        approverType: "role-based",
        approverId: "direct-manager",
        approverLabel: "Direct Manager",
        timeoutHours: 24,
        timeoutAction: "remind",
        allowDelegation: true,
      },
    ],
  },
  standard: {
    name: "Standard (2-step)",
    steps: [
      {
        approverType: "role-based",
        approverId: "direct-manager",
        approverLabel: "Direct Manager",
        timeoutHours: 24,
        timeoutAction: "remind",
        allowDelegation: true,
      },
      {
        approverType: "role-based",
        approverId: "hr-manager",
        approverLabel: "HR Manager",
        timeoutHours: 48,
        timeoutAction: "escalate",
        allowDelegation: false,
      },
    ],
  },
  enterprise: {
    name: "Enterprise (3-step)",
    steps: [
      {
        approverType: "role-based",
        approverId: "direct-manager",
        approverLabel: "Direct Manager",
        timeoutHours: 24,
        timeoutAction: "remind",
        allowDelegation: true,
      },
      {
        approverType: "role-based",
        approverId: "department-head",
        approverLabel: "Department Head",
        timeoutHours: 48,
        timeoutAction: "escalate",
        allowDelegation: true,
      },
      {
        approverType: "role-based",
        approverId: "hr-manager",
        approverLabel: "HR Manager",
        timeoutHours: 72,
        timeoutAction: "notify-hr",
        allowDelegation: false,
      },
    ],
  },
};

/* =========================================================================
   ID generation (deterministic for SSR safety)
   ========================================================================= */

let stepCounter = 0;

function generateStepId(): string {
  stepCounter += 1;
  return `step-${Date.now()}-${stepCounter}`;
}

/* =========================================================================
   Store actions (pure functions — no external dependency on Zustand)
   These can be used standalone in tests without the store.
   ========================================================================= */

export function addStep(
  state: WorkflowBuilderState
): WorkflowBuilderState {
  const newStep: WorkflowStep = {
    ...DEFAULT_STEP,
    id: generateStepId(),
  };
  return {
    ...state,
    steps: [...state.steps, newStep],
    isDirty: true,
  };
}

export function removeStep(
  state: WorkflowBuilderState,
  stepId: string
): WorkflowBuilderState {
  return {
    ...state,
    steps: state.steps.filter((s) => s.id !== stepId),
    isDirty: true,
  };
}

export function updateStep(
  state: WorkflowBuilderState,
  stepId: string,
  patch: Partial<Omit<WorkflowStep, "id">>
): WorkflowBuilderState {
  return {
    ...state,
    steps: state.steps.map((s) =>
      s.id === stepId ? { ...s, ...patch } : s
    ),
    isDirty: true,
  };
}

export function moveStepUp(
  state: WorkflowBuilderState,
  stepId: string
): WorkflowBuilderState {
  const index = state.steps.findIndex((s) => s.id === stepId);
  if (index <= 0) return state;
  const newSteps = [...state.steps];
  const prev = newSteps[index - 1];
  const current = newSteps[index];
  if (!prev || !current) return state;
  newSteps[index - 1] = current;
  newSteps[index] = prev;
  return { ...state, steps: newSteps, isDirty: true };
}

export function moveStepDown(
  state: WorkflowBuilderState,
  stepId: string
): WorkflowBuilderState {
  const index = state.steps.findIndex((s) => s.id === stepId);
  if (index < 0 || index >= state.steps.length - 1) return state;
  const newSteps = [...state.steps];
  const next = newSteps[index + 1];
  const current = newSteps[index];
  if (!next || !current) return state;
  newSteps[index + 1] = current;
  newSteps[index] = next;
  return { ...state, steps: newSteps, isDirty: true };
}

export function applyTemplate(
  state: WorkflowBuilderState,
  template: Exclude<WorkflowTemplate, null>
): WorkflowBuilderState {
  const preset = TEMPLATE_PRESETS[template];
  const steps = preset.steps.map((s) => ({
    ...s,
    id: generateStepId(),
  }));
  return {
    ...state,
    steps,
    selectedTemplate: template,
    workflowName: preset.name,
    isDirty: true,
  };
}

export function setWorkflowName(
  state: WorkflowBuilderState,
  name: string
): WorkflowBuilderState {
  return { ...state, workflowName: name, isDirty: true };
}

export function markClean(
  state: WorkflowBuilderState
): WorkflowBuilderState {
  return { ...state, isDirty: false };
}

/* =========================================================================
   Initial state factory
   ========================================================================= */

export function createInitialState(): WorkflowBuilderState {
  return {
    steps: [],
    selectedTemplate: null,
    isDirty: false,
    workflowName: "New Workflow",
  };
}
