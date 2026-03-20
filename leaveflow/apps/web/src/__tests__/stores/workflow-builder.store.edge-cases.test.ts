/**
 * Edge-case tests for workflow-builder.store pure functions.
 */

import {
  createInitialState,
  addStep,
  removeStep,
  updateStep,
  moveStepUp,
  moveStepDown,
  applyTemplate,
  type WorkflowBuilderState,
  type WorkflowStep,
} from "../../stores/workflow-builder.store";

function makeState(overrides: Partial<WorkflowBuilderState> = {}): WorkflowBuilderState {
  return { ...createInitialState(), ...overrides };
}

/* =========================================================================
   Step ID uniqueness across multiple sessions
   ========================================================================= */

describe("step ID uniqueness", () => {
  it("generates unique IDs for 10 sequential addStep calls", () => {
    let state = makeState();
    for (let i = 0; i < 10; i++) {
      state = addStep(state);
    }
    const ids = state.steps.map((s) => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
  });
});

/* =========================================================================
   moveStepUp on single-item list
   ========================================================================= */

describe("moveStepUp edge cases", () => {
  it("is a no-op on single step list", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = moveStepUp(s1, stepId);
    expect(s2.steps[0]!.id).toBe(stepId);
    expect(s2.steps).toHaveLength(1);
  });

  it("is a no-op on unknown step id", () => {
    const s1 = addStep(addStep(makeState()));
    const originalOrder = s1.steps.map((s) => s.id);
    const s2 = moveStepUp(s1, "not-a-real-id");
    expect(s2.steps.map((s) => s.id)).toEqual(originalOrder);
  });
});

/* =========================================================================
   moveStepDown edge cases
   ========================================================================= */

describe("moveStepDown edge cases", () => {
  it("is a no-op on single step list", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = moveStepDown(s1, stepId);
    expect(s2.steps[0]!.id).toBe(stepId);
    expect(s2.steps).toHaveLength(1);
  });

  it("is a no-op on unknown step id", () => {
    const s1 = addStep(addStep(makeState()));
    const originalOrder = s1.steps.map((s) => s.id);
    const s2 = moveStepDown(s1, "not-a-real-id");
    expect(s2.steps.map((s) => s.id)).toEqual(originalOrder);
  });
});

/* =========================================================================
   removeStep edge cases
   ========================================================================= */

describe("removeStep edge cases", () => {
  it("handles removing from single-item list", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = removeStep(s1, stepId);
    expect(s2.steps).toHaveLength(0);
  });

  it("handles removing from empty list gracefully", () => {
    const s1 = makeState();
    const s2 = removeStep(s1, "phantom-id");
    expect(s2.steps).toHaveLength(0);
  });
});

/* =========================================================================
   updateStep timeout value boundaries
   ========================================================================= */

describe("updateStep timeout values", () => {
  it("accepts 1 hour as minimum timeout", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = updateStep(s1, stepId, { timeoutHours: 1 });
    expect(s2.steps[0]!.timeoutHours).toBe(1);
  });

  it("accepts 720 hours as maximum timeout", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = updateStep(s1, stepId, { timeoutHours: 720 });
    expect(s2.steps[0]!.timeoutHours).toBe(720);
  });

  it("allows updating delegation toggle", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const original = s1.steps[0]!.allowDelegation;
    const s2 = updateStep(s1, stepId, { allowDelegation: !original });
    expect(s2.steps[0]!.allowDelegation).toBe(!original);
  });
});

/* =========================================================================
   applyTemplate with existing dirty state
   ========================================================================= */

describe("applyTemplate resets from existing state", () => {
  it("replaces steps when applying to dirty state", () => {
    let state = makeState();
    for (let i = 0; i < 5; i++) {
      state = addStep(state);
    }
    expect(state.steps).toHaveLength(5);

    const applied = applyTemplate(state, "simple");
    expect(applied.steps).toHaveLength(1);
  });

  it("switching templates replaces all steps", () => {
    const s1 = applyTemplate(makeState(), "enterprise");
    expect(s1.steps).toHaveLength(3);

    const s2 = applyTemplate(s1, "simple");
    expect(s2.steps).toHaveLength(1);
    expect(s2.selectedTemplate).toBe("simple");
  });
});

/* =========================================================================
   updateStep with all timeout actions
   ========================================================================= */

describe("updateStep timeout actions", () => {
  const timeoutActions = ["remind", "escalate", "auto-approve", "notify-hr"] as const;

  timeoutActions.forEach((action) => {
    it(`accepts '${action}' as timeout action`, () => {
      const s1 = addStep(makeState());
      const stepId = s1.steps[0]!.id;
      const s2 = updateStep(s1, stepId, { timeoutAction: action });
      expect(s2.steps[0]!.timeoutAction).toBe(action);
    });
  });
});

/* =========================================================================
   updateStep with all approver types
   ========================================================================= */

describe("updateStep approver types", () => {
  const approverTypes = ["role-based", "specific", "group"] as const;

  approverTypes.forEach((type) => {
    it(`accepts '${type}' as approver type`, () => {
      const s1 = addStep(makeState());
      const stepId = s1.steps[0]!.id;
      const s2 = updateStep(s1, stepId, { approverType: type });
      expect(s2.steps[0]!.approverType).toBe(type);
    });
  });
});

/* =========================================================================
   Step defaults
   ========================================================================= */

describe("new step defaults", () => {
  it("has default timeoutHours of 24", () => {
    const s1 = addStep(makeState());
    expect(s1.steps[0]!.timeoutHours).toBe(24);
  });

  it("has default timeoutAction of remind", () => {
    const s1 = addStep(makeState());
    expect(s1.steps[0]!.timeoutAction).toBe("remind");
  });

  it("has default allowDelegation of true", () => {
    const s1 = addStep(makeState());
    expect(s1.steps[0]!.allowDelegation).toBe(true);
  });

  it("has empty approverLabel by default", () => {
    const s1 = addStep(makeState());
    expect(s1.steps[0]!.approverLabel).toBe("");
  });
});

/* =========================================================================
   State shape validation
   ========================================================================= */

describe("state shape", () => {
  it("addStep result contains all required WorkflowBuilderState fields", () => {
    const s = addStep(makeState());
    expect(s).toHaveProperty("steps");
    expect(s).toHaveProperty("selectedTemplate");
    expect(s).toHaveProperty("isDirty");
    expect(s).toHaveProperty("workflowName");
  });

  it("each step contains all required WorkflowStep fields", () => {
    const s = addStep(makeState());
    const step: WorkflowStep = s.steps[0]!;
    expect(step).toHaveProperty("id");
    expect(step).toHaveProperty("approverType");
    expect(step).toHaveProperty("approverId");
    expect(step).toHaveProperty("approverLabel");
    expect(step).toHaveProperty("timeoutHours");
    expect(step).toHaveProperty("timeoutAction");
    expect(step).toHaveProperty("allowDelegation");
  });
});
