/**
 * Tests for workflow-builder.store pure functions.
 *
 * All functions are pure (no side effects, no external deps),
 * so these run without any test framework DOM support.
 */

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
  TEMPLATE_PRESETS,
  type WorkflowBuilderState,
} from "../../stores/workflow-builder.store";

/* =========================================================================
   Helpers
   ========================================================================= */

function makeState(overrides: Partial<WorkflowBuilderState> = {}): WorkflowBuilderState {
  return { ...createInitialState(), ...overrides };
}

/* =========================================================================
   createInitialState
   ========================================================================= */

describe("createInitialState", () => {
  it("returns empty steps array", () => {
    const state = createInitialState();
    expect(state.steps).toHaveLength(0);
  });

  it("returns isDirty = false", () => {
    const state = createInitialState();
    expect(state.isDirty).toBe(false);
  });

  it("returns selectedTemplate = null", () => {
    const state = createInitialState();
    expect(state.selectedTemplate).toBeNull();
  });

  it("returns default workflow name", () => {
    const state = createInitialState();
    expect(state.workflowName).toBe("New Workflow");
  });
});

/* =========================================================================
   addStep
   ========================================================================= */

describe("addStep", () => {
  it("adds a new step to an empty state", () => {
    const before = makeState();
    const after = addStep(before);
    expect(after.steps).toHaveLength(1);
  });

  it("adds a new step to an existing list", () => {
    const before = makeState();
    const after = addStep(addStep(before));
    expect(after.steps).toHaveLength(2);
  });

  it("sets isDirty = true", () => {
    const before = makeState();
    const after = addStep(before);
    expect(after.isDirty).toBe(true);
  });

  it("does not mutate original state", () => {
    const before = makeState();
    addStep(before);
    expect(before.steps).toHaveLength(0);
  });

  it("assigns a unique id to each step", () => {
    const s0 = makeState();
    const s1 = addStep(s0);
    const s2 = addStep(s1);
    const ids = s2.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(2);
  });

  it("new step has default approver type = role-based", () => {
    const after = addStep(makeState());
    const step = after.steps[0];
    expect(step).toBeDefined();
    expect(step!.approverType).toBe("role-based");
  });
});

/* =========================================================================
   removeStep
   ========================================================================= */

describe("removeStep", () => {
  it("removes the step with the given id", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = removeStep(s1, stepId);
    expect(s2.steps).toHaveLength(0);
  });

  it("does not remove other steps", () => {
    const s1 = addStep(addStep(makeState()));
    const firstId = s1.steps[0]!.id;
    const s2 = removeStep(s1, firstId);
    expect(s2.steps).toHaveLength(1);
    expect(s2.steps[0]!.id).toBe(s1.steps[1]!.id);
  });

  it("sets isDirty = true", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = removeStep(s1, stepId);
    expect(s2.isDirty).toBe(true);
  });

  it("does not mutate original steps array", () => {
    const s1 = addStep(makeState());
    const originalSteps = s1.steps;
    const stepId = s1.steps[0]!.id;
    removeStep(s1, stepId);
    expect(s1.steps).toBe(originalSteps);
  });

  it("is a no-op for unknown id", () => {
    const s1 = addStep(makeState());
    const s2 = removeStep(s1, "unknown-id");
    expect(s2.steps).toHaveLength(1);
  });
});

/* =========================================================================
   updateStep
   ========================================================================= */

describe("updateStep", () => {
  it("updates matching step fields", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = updateStep(s1, stepId, { approverLabel: "HR Manager" });
    expect(s2.steps[0]!.approverLabel).toBe("HR Manager");
  });

  it("does not mutate other fields", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const original = s1.steps[0]!;
    const s2 = updateStep(s1, stepId, { approverLabel: "Updated" });
    expect(s2.steps[0]!.timeoutHours).toBe(original.timeoutHours);
    expect(s2.steps[0]!.approverType).toBe(original.approverType);
  });

  it("does not mutate other steps", () => {
    const s1 = addStep(addStep(makeState()));
    const firstId = s1.steps[0]!.id;
    const secondStep = s1.steps[1]!;
    const s2 = updateStep(s1, firstId, { approverLabel: "Changed" });
    expect(s2.steps[1]).toBe(secondStep);
  });

  it("sets isDirty = true", () => {
    const s1 = addStep(makeState());
    const stepId = s1.steps[0]!.id;
    const s2 = updateStep(s1, stepId, { approverLabel: "x" });
    expect(s2.isDirty).toBe(true);
  });

  it("is a no-op for unknown id", () => {
    const s1 = addStep(makeState());
    const s2 = updateStep(s1, "unknown", { approverLabel: "x" });
    expect(s2.steps[0]!.approverLabel).toBe(s1.steps[0]!.approverLabel);
  });
});

/* =========================================================================
   moveStepUp
   ========================================================================= */

describe("moveStepUp", () => {
  it("swaps step with the one above it", () => {
    const s1 = addStep(addStep(makeState()));
    const firstId = s1.steps[0]!.id;
    const secondId = s1.steps[1]!.id;
    const s2 = moveStepUp(s1, secondId);
    expect(s2.steps[0]!.id).toBe(secondId);
    expect(s2.steps[1]!.id).toBe(firstId);
  });

  it("is a no-op when step is already first", () => {
    const s1 = addStep(addStep(makeState()));
    const firstId = s1.steps[0]!.id;
    const s2 = moveStepUp(s1, firstId);
    expect(s2.steps[0]!.id).toBe(firstId);
  });

  it("sets isDirty = true when moved", () => {
    const s1 = addStep(addStep(makeState()));
    const secondId = s1.steps[1]!.id;
    const s2 = moveStepUp(s1, secondId);
    expect(s2.isDirty).toBe(true);
  });

  it("does not mutate original", () => {
    const s1 = addStep(addStep(makeState()));
    const originalFirst = s1.steps[0]!.id;
    const secondId = s1.steps[1]!.id;
    moveStepUp(s1, secondId);
    expect(s1.steps[0]!.id).toBe(originalFirst);
  });
});

/* =========================================================================
   moveStepDown
   ========================================================================= */

describe("moveStepDown", () => {
  it("swaps step with the one below it", () => {
    const s1 = addStep(addStep(makeState()));
    const firstId = s1.steps[0]!.id;
    const secondId = s1.steps[1]!.id;
    const s2 = moveStepDown(s1, firstId);
    expect(s2.steps[0]!.id).toBe(secondId);
    expect(s2.steps[1]!.id).toBe(firstId);
  });

  it("is a no-op when step is already last", () => {
    const s1 = addStep(addStep(makeState()));
    const lastId = s1.steps[1]!.id;
    const s2 = moveStepDown(s1, lastId);
    expect(s2.steps[1]!.id).toBe(lastId);
  });

  it("sets isDirty = true when moved", () => {
    const s1 = addStep(addStep(makeState()));
    const firstId = s1.steps[0]!.id;
    const s2 = moveStepDown(s1, firstId);
    expect(s2.isDirty).toBe(true);
  });
});

/* =========================================================================
   applyTemplate
   ========================================================================= */

describe("applyTemplate", () => {
  it("applies simple template with 1 step", () => {
    const s1 = applyTemplate(makeState(), "simple");
    expect(s1.steps).toHaveLength(TEMPLATE_PRESETS.simple.steps.length);
  });

  it("applies standard template with 2 steps", () => {
    const s1 = applyTemplate(makeState(), "standard");
    expect(s1.steps).toHaveLength(TEMPLATE_PRESETS.standard.steps.length);
  });

  it("applies enterprise template with 3 steps", () => {
    const s1 = applyTemplate(makeState(), "enterprise");
    expect(s1.steps).toHaveLength(TEMPLATE_PRESETS.enterprise.steps.length);
  });

  it("sets selectedTemplate", () => {
    const s1 = applyTemplate(makeState(), "standard");
    expect(s1.selectedTemplate).toBe("standard");
  });

  it("sets workflowName from preset", () => {
    const s1 = applyTemplate(makeState(), "simple");
    expect(s1.workflowName).toBe(TEMPLATE_PRESETS.simple.name);
  });

  it("sets isDirty = true", () => {
    const s1 = applyTemplate(makeState(), "simple");
    expect(s1.isDirty).toBe(true);
  });

  it("replaces existing steps", () => {
    const s1 = addStep(addStep(addStep(makeState())));
    const s2 = applyTemplate(s1, "simple");
    expect(s2.steps).toHaveLength(TEMPLATE_PRESETS.simple.steps.length);
  });

  it("assigns unique ids to applied steps", () => {
    const s1 = applyTemplate(makeState(), "enterprise");
    const ids = s1.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("does not mutate original state", () => {
    const original = makeState();
    applyTemplate(original, "simple");
    expect(original.steps).toHaveLength(0);
    expect(original.selectedTemplate).toBeNull();
  });
});

/* =========================================================================
   setWorkflowName
   ========================================================================= */

describe("setWorkflowName", () => {
  it("updates workflow name", () => {
    const s1 = setWorkflowName(makeState(), "My Custom Workflow");
    expect(s1.workflowName).toBe("My Custom Workflow");
  });

  it("sets isDirty = true", () => {
    const s1 = setWorkflowName(makeState(), "Test");
    expect(s1.isDirty).toBe(true);
  });

  it("does not mutate original", () => {
    const original = makeState();
    setWorkflowName(original, "Changed");
    expect(original.workflowName).toBe("New Workflow");
  });

  it("accepts empty string", () => {
    const s1 = setWorkflowName(makeState(), "");
    expect(s1.workflowName).toBe("");
  });
});

/* =========================================================================
   markClean
   ========================================================================= */

describe("markClean", () => {
  it("sets isDirty = false", () => {
    const dirty = addStep(makeState());
    expect(dirty.isDirty).toBe(true);
    const clean = markClean(dirty);
    expect(clean.isDirty).toBe(false);
  });

  it("preserves all other state", () => {
    const dirty = applyTemplate(makeState(), "standard");
    const clean = markClean(dirty);
    expect(clean.steps).toHaveLength(dirty.steps.length);
    expect(clean.selectedTemplate).toBe(dirty.selectedTemplate);
    expect(clean.workflowName).toBe(dirty.workflowName);
  });

  it("does not mutate original", () => {
    const dirty = addStep(makeState());
    markClean(dirty);
    expect(dirty.isDirty).toBe(true);
  });
});

/* =========================================================================
   Immutability — cross-cutting concern
   ========================================================================= */

describe("immutability guarantees", () => {
  it("addStep returns a new state object", () => {
    const before = makeState();
    const after = addStep(before);
    expect(after).not.toBe(before);
  });

  it("removeStep returns a new state object", () => {
    const s1 = addStep(makeState());
    const s2 = removeStep(s1, s1.steps[0]!.id);
    expect(s2).not.toBe(s1);
  });

  it("updateStep returns a new steps array", () => {
    const s1 = addStep(makeState());
    const s2 = updateStep(s1, s1.steps[0]!.id, { approverLabel: "x" });
    expect(s2.steps).not.toBe(s1.steps);
  });

  it("moveStepUp returns a new steps array", () => {
    const s1 = addStep(addStep(makeState()));
    const s2 = moveStepUp(s1, s1.steps[1]!.id);
    expect(s2.steps).not.toBe(s1.steps);
  });
});
