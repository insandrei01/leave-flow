/**
 * Workflow service — business logic for workflow management.
 *
 * Responsibilities:
 * - CRUD with version increment on every update (BR-102)
 * - Template instantiation (Simple, Standard, Enterprise)
 * - Clone
 * - Step validation (approverType, timeoutHours > 0, valid escalationMode)
 * - createSnapshot — returns frozen copy for embedding in leave requests
 */

import type { WorkflowRepository } from "./workflow.repository.js";
import type {
  CreateWorkflowInput,
  UpdateWorkflowInput,
  WorkflowRecord,
  WorkflowSnapshot,
  WorkflowStepInput,
  TemplateType,
} from "./workflow.types.js";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const VALID_APPROVER_TYPES = new Set([
  "specific_user",
  "role_direct_manager",
  "role_team_lead",
  "role_hr",
  "group",
]);

const VALID_ESCALATION_ACTIONS = new Set([
  "escalate_next",
  "remind",
  "auto_approve",
  "notify_hr",
  "none",
]);

// ----------------------------------------------------------------
// Template definitions
// ----------------------------------------------------------------

const TEMPLATES: Record<TemplateType, WorkflowStepInput[]> = {
  simple: [
    {
      order: 0,
      approverType: "role_direct_manager",
      timeoutHours: 48,
      escalationAction: "remind",
      maxReminders: 3,
      allowDelegation: true,
    },
  ],
  standard: [
    {
      order: 0,
      approverType: "role_direct_manager",
      timeoutHours: 48,
      escalationAction: "escalate_next",
      maxReminders: 2,
      allowDelegation: true,
    },
    {
      order: 1,
      approverType: "role_hr",
      timeoutHours: 72,
      escalationAction: "remind",
      maxReminders: 3,
      allowDelegation: false,
    },
  ],
  enterprise: [
    {
      order: 0,
      approverType: "role_direct_manager",
      timeoutHours: 24,
      escalationAction: "escalate_next",
      maxReminders: 1,
      allowDelegation: true,
    },
    {
      order: 1,
      approverType: "role_team_lead",
      timeoutHours: 48,
      escalationAction: "escalate_next",
      maxReminders: 2,
      allowDelegation: true,
    },
    {
      order: 2,
      approverType: "role_hr",
      timeoutHours: 72,
      escalationAction: "notify_hr",
      maxReminders: 3,
      allowDelegation: false,
    },
  ],
};

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface WorkflowService {
  findAll(tenantId: string): Promise<WorkflowRecord[]>;
  findById(tenantId: string, id: string): Promise<WorkflowRecord>;
  create(tenantId: string, input: CreateWorkflowInput): Promise<WorkflowRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateWorkflowInput
  ): Promise<WorkflowRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  createFromTemplate(
    tenantId: string,
    templateType: TemplateType,
    name: string
  ): Promise<WorkflowRecord>;
  clone(tenantId: string, id: string, newName: string): Promise<WorkflowRecord>;
  createSnapshot(tenantId: string, workflowId: string): Promise<WorkflowSnapshot>;
}

export function createWorkflowService(deps: {
  repo: WorkflowRepository;
}): WorkflowService {
  const { repo } = deps;

  return {
    async findAll(tenantId: string): Promise<WorkflowRecord[]> {
      return repo.findAll(tenantId);
    },

    async findById(tenantId: string, id: string): Promise<WorkflowRecord> {
      const record = await repo.findById(tenantId, id);
      if (record === null) {
        throw new Error(`Workflow not found: ${id}`);
      }
      return record;
    },

    async create(
      tenantId: string,
      input: CreateWorkflowInput
    ): Promise<WorkflowRecord> {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error("Workflow name is required");
      }

      validateSteps(input.steps);

      return repo.create(tenantId, input);
    },

    async update(
      tenantId: string,
      id: string,
      input: UpdateWorkflowInput
    ): Promise<WorkflowRecord> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Workflow not found: ${id}`);
      }

      if (input.name !== undefined && input.name.trim().length === 0) {
        throw new Error("Workflow name cannot be empty");
      }

      if (input.steps !== undefined) {
        validateSteps(input.steps);
      }

      const nextVersion = existing.version + 1;
      const updated = await repo.update(tenantId, id, {
        ...input,
        version: nextVersion,
      });

      if (updated === null) {
        throw new Error(`Failed to update workflow: ${id}`);
      }

      return updated;
    },

    async delete(tenantId: string, id: string): Promise<void> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Workflow not found: ${id}`);
      }

      const hasTeams = await repo.hasAssignedTeams(tenantId, id);
      if (hasTeams) {
        throw new Error(
          `Cannot delete workflow "${existing.name}": it is assigned to one or more teams`
        );
      }

      await repo.delete(tenantId, id);
    },

    async createFromTemplate(
      tenantId: string,
      templateType: TemplateType,
      name: string
    ): Promise<WorkflowRecord> {
      const steps = TEMPLATES[templateType];
      if (steps === undefined) {
        throw new Error(`Unknown template type: ${templateType}`);
      }

      if (!name || name.trim().length === 0) {
        throw new Error("Workflow name is required");
      }

      return repo.create(tenantId, {
        name,
        description: `Created from ${templateType} template`,
        steps,
        isTemplate: false,
        templateSlug: templateType,
      });
    },

    async clone(
      tenantId: string,
      id: string,
      newName: string
    ): Promise<WorkflowRecord> {
      const source = await repo.findById(tenantId, id);
      if (source === null) {
        throw new Error(`Workflow not found: ${id}`);
      }

      if (!newName || newName.trim().length === 0) {
        throw new Error("New workflow name is required for clone");
      }

      const clonedSteps: WorkflowStepInput[] = source.steps.map((s) => ({
        order: s.order,
        approverType: s.approverType,
        approverUserId: s.approverUserId,
        approverGroupIds: s.approverGroupIds,
        timeoutHours: s.timeoutHours,
        escalationAction: s.escalationAction,
        maxReminders: s.maxReminders,
        allowDelegation: s.allowDelegation,
      }));

      return repo.create(tenantId, {
        name: newName,
        description: source.description,
        steps: clonedSteps,
        isTemplate: false,
        templateSlug: null,
      });
    },

    async createSnapshot(
      tenantId: string,
      workflowId: string
    ): Promise<WorkflowSnapshot> {
      const workflow = await repo.findById(tenantId, workflowId);
      if (workflow === null) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      // Return a frozen deep copy — safe for embedding in leave requests
      const snapshot: WorkflowSnapshot = Object.freeze({
        workflowId: workflow.id,
        workflowVersion: workflow.version,
        name: workflow.name,
        steps: workflow.steps.map((s) => Object.freeze({ ...s })),
      });

      return snapshot;
    },
  };
}

// ----------------------------------------------------------------
// Private validators
// ----------------------------------------------------------------

function validateSteps(steps: WorkflowStepInput[]): void {
  if (!Array.isArray(steps)) {
    throw new Error("Workflow steps must be an array");
  }

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (step === undefined) continue;

    if (!VALID_APPROVER_TYPES.has(step.approverType)) {
      throw new Error(
        `Invalid approverType at step ${i}: "${step.approverType}"`
      );
    }

    if (step.timeoutHours <= 0) {
      throw new Error(
        `timeoutHours must be greater than 0 at step ${i} (got ${step.timeoutHours})`
      );
    }

    if (!VALID_ESCALATION_ACTIONS.has(step.escalationAction)) {
      throw new Error(
        `Invalid escalationAction at step ${i}: "${step.escalationAction}"`
      );
    }
  }
}
