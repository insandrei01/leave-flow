/**
 * Team service — business logic for team management.
 *
 * Responsibilities:
 * - CRUD with name uniqueness validation per tenant
 * - Validate managerId references an active employee
 * - Validate workflowId exists
 */

import type { TeamRepository } from "./team.repository.js";
import type {
  CreateTeamInput,
  UpdateTeamInput,
  TeamRecord,
  TeamMemberRecord,
} from "./team.types.js";

// ----------------------------------------------------------------
// Dependency interfaces (kept minimal to avoid circular imports)
// ----------------------------------------------------------------

export interface EmployeeExistenceChecker {
  isActiveEmployee(tenantId: string, employeeId: string): Promise<boolean>;
}

export interface WorkflowExistenceChecker {
  workflowExists(tenantId: string, workflowId: string): Promise<boolean>;
}

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface TeamService {
  findAll(tenantId: string): Promise<TeamRecord[]>;
  findById(tenantId: string, id: string): Promise<TeamRecord>;
  create(tenantId: string, input: CreateTeamInput): Promise<TeamRecord>;
  update(
    tenantId: string,
    id: string,
    input: UpdateTeamInput
  ): Promise<TeamRecord>;
  delete(tenantId: string, id: string): Promise<void>;
  findMembers(tenantId: string, teamId: string): Promise<TeamMemberRecord[]>;
}

export function createTeamService(deps: {
  repo: TeamRepository;
  employeeChecker?: EmployeeExistenceChecker;
  workflowChecker?: WorkflowExistenceChecker;
}): TeamService {
  const { repo, employeeChecker, workflowChecker } = deps;

  return {
    async findAll(tenantId: string): Promise<TeamRecord[]> {
      return repo.findAll(tenantId);
    },

    async findById(tenantId: string, id: string): Promise<TeamRecord> {
      const record = await repo.findById(tenantId, id);
      if (record === null) {
        throw new Error(`Team not found: ${id}`);
      }
      return record;
    },

    async create(tenantId: string, input: CreateTeamInput): Promise<TeamRecord> {
      if (!input.name || input.name.trim().length === 0) {
        throw new Error("Team name is required");
      }

      const existing = await repo.findByName(tenantId, input.name);
      if (existing !== null) {
        throw new Error(
          `Team with name "${input.name}" already exists for this tenant`
        );
      }

      if (input.managerId !== undefined && input.managerId !== null) {
        await validateManagerId(tenantId, input.managerId, employeeChecker);
      }

      if (input.workflowId !== undefined && input.workflowId !== null) {
        await validateWorkflowId(tenantId, input.workflowId, workflowChecker);
      }

      return repo.create(tenantId, input);
    },

    async update(
      tenantId: string,
      id: string,
      input: UpdateTeamInput
    ): Promise<TeamRecord> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Team not found: ${id}`);
      }

      if (input.name !== undefined && input.name !== existing.name) {
        if (input.name.trim().length === 0) {
          throw new Error("Team name cannot be empty");
        }
        const duplicate = await repo.findByName(tenantId, input.name);
        if (duplicate !== null) {
          throw new Error(
            `Team with name "${input.name}" already exists for this tenant`
          );
        }
      }

      if (input.managerId !== undefined && input.managerId !== null) {
        await validateManagerId(tenantId, input.managerId, employeeChecker);
      }

      if (input.workflowId !== undefined && input.workflowId !== null) {
        await validateWorkflowId(tenantId, input.workflowId, workflowChecker);
      }

      const updated = await repo.update(tenantId, id, input);
      if (updated === null) {
        throw new Error(`Failed to update team: ${id}`);
      }

      return updated;
    },

    async delete(tenantId: string, id: string): Promise<void> {
      const existing = await repo.findById(tenantId, id);
      if (existing === null) {
        throw new Error(`Team not found: ${id}`);
      }

      await repo.delete(tenantId, id);
    },

    async findMembers(
      tenantId: string,
      teamId: string
    ): Promise<TeamMemberRecord[]> {
      const team = await repo.findById(tenantId, teamId);
      if (team === null) {
        throw new Error(`Team not found: ${teamId}`);
      }

      return repo.findMembers(tenantId, teamId);
    },
  };
}

// ----------------------------------------------------------------
// Private validators
// ----------------------------------------------------------------

async function validateManagerId(
  tenantId: string,
  managerId: string,
  checker?: EmployeeExistenceChecker
): Promise<void> {
  if (checker === undefined) return;

  const isActive = await checker.isActiveEmployee(tenantId, managerId);
  if (!isActive) {
    throw new Error(
      `Manager not found or not active: ${managerId}`
    );
  }
}

async function validateWorkflowId(
  tenantId: string,
  workflowId: string,
  checker?: WorkflowExistenceChecker
): Promise<void> {
  if (checker === undefined) return;

  const exists = await checker.workflowExists(tenantId, workflowId);
  if (!exists) {
    throw new Error(`Workflow not found: ${workflowId}`);
  }
}
