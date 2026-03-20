/**
 * Factory functions for creating test documents in MongoDB.
 *
 * Each factory creates a real Mongoose document in the connected test database.
 * Factories accept optional overrides so tests can customise specific fields
 * without having to specify every required field.
 *
 * Immutability: overrides are spread into defaults — originals are never mutated.
 *
 * Prerequisites:
 * - setupTestDb() must be called before any factory is used.
 */

import mongoose from "mongoose";
import {
  TenantModel,
  EmployeeModel,
  TeamModel,
  WorkflowModel,
  LeaveTypeModel,
  LeaveRequestModel,
  BalanceLedgerModel,
  type ITenant,
  type IEmployee,
  type ITeam,
  type IWorkflow,
  type ILeaveType,
  type ILeaveRequest,
  type IBalanceLedger,
} from "../../src/models/index.js";

// ----------------------------------------------------------------
// Counter for generating unique values within a test run
// ----------------------------------------------------------------

let counter = 0;
function nextId(): number {
  counter += 1;
  return counter;
}

// ----------------------------------------------------------------
// Tenant factory
// ----------------------------------------------------------------

type TenantOverrides = Partial<
  Pick<ITenant, "name" | "slug" | "plan" | "isActive">
>;

/**
 * Creates and saves a tenant document with sensible defaults.
 */
export async function createTestTenant(
  overrides: TenantOverrides = {}
): Promise<ITenant> {
  const n = nextId();
  const defaults: TenantOverrides = {
    name: `Test Company ${n}`,
    slug: `test-company-${n}`,
    plan: "free",
    isActive: true,
  };

  const doc = new TenantModel({ ...defaults, ...overrides });
  return doc.save();
}

// ----------------------------------------------------------------
// Employee factory
// ----------------------------------------------------------------

type EmployeeOverrides = Partial<
  Pick<
    IEmployee,
    | "email"
    | "firstName"
    | "lastName"
    | "role"
    | "startDate"
    | "firebaseUid"
    | "status"
    | "primaryPlatform"
    | "teamId"
  >
>;

/**
 * Creates and saves an employee document belonging to the given tenant.
 */
export async function createTestEmployee(
  tenantId: string,
  overrides: EmployeeOverrides = {}
): Promise<IEmployee> {
  const n = nextId();
  const defaults: EmployeeOverrides & { tenantId: string } = {
    tenantId,
    email: `employee-${n}@example.com`,
    firstName: "Test",
    lastName: `Employee ${n}`,
    role: "employee",
    startDate: new Date("2024-01-01"),
    firebaseUid: null,
    status: "active",
    primaryPlatform: "email",
    teamId: null,
  };

  const doc = new EmployeeModel({ ...defaults, ...overrides });
  return doc.save();
}

// ----------------------------------------------------------------
// Team factory
// ----------------------------------------------------------------

type TeamOverrides = Partial<
  Pick<ITeam, "name" | "managerId" | "workflowId" | "isActive">
>;

/**
 * Creates and saves a team document belonging to the given tenant.
 */
export async function createTestTeam(
  tenantId: string,
  overrides: TeamOverrides = {}
): Promise<ITeam> {
  const n = nextId();
  const defaults: TeamOverrides & { tenantId: string } = {
    tenantId,
    name: `Test Team ${n}`,
    managerId: null,
    workflowId: null,
    isActive: true,
  };

  const doc = new TeamModel({ ...defaults, ...overrides });
  return doc.save();
}

// ----------------------------------------------------------------
// Workflow factory
// ----------------------------------------------------------------

type WorkflowOverrides = Partial<
  Pick<IWorkflow, "name" | "description" | "isActive" | "isTemplate">
>;

/**
 * Creates and saves a workflow document with two default approval steps.
 */
export async function createTestWorkflow(
  tenantId: string,
  overrides: WorkflowOverrides = {}
): Promise<IWorkflow> {
  const n = nextId();
  const defaults: WorkflowOverrides & { tenantId: string; steps: IWorkflow["steps"] } = {
    tenantId,
    name: `Test Workflow ${n}`,
    description: null,
    isActive: true,
    isTemplate: false,
    steps: [
      {
        order: 0,
        approverType: "role_direct_manager",
        approverUserId: null,
        approverGroupIds: null,
        timeoutHours: 48,
        escalationAction: "remind",
        maxReminders: 3,
        allowDelegation: true,
      },
      {
        order: 1,
        approverType: "role_hr",
        approverUserId: null,
        approverGroupIds: null,
        timeoutHours: 72,
        escalationAction: "escalate_next",
        maxReminders: 2,
        allowDelegation: false,
      },
    ],
  };

  const doc = new WorkflowModel({ ...defaults, ...overrides });
  return doc.save();
}

// ----------------------------------------------------------------
// LeaveType factory
// ----------------------------------------------------------------

type LeaveTypeOverrides = Partial<
  Pick<
    ILeaveType,
    | "name"
    | "slug"
    | "isPaid"
    | "requiresApproval"
    | "defaultEntitlementDays"
    | "isActive"
    | "isDefault"
  >
>;

/**
 * Creates and saves a leave type document for the given tenant.
 */
export async function createTestLeaveType(
  tenantId: string,
  overrides: LeaveTypeOverrides = {}
): Promise<ILeaveType> {
  const n = nextId();
  const defaults: LeaveTypeOverrides & { tenantId: string } = {
    tenantId,
    name: `Annual Leave ${n}`,
    slug: `annual-leave-${n}`,
    isPaid: true,
    requiresApproval: true,
    defaultEntitlementDays: 20,
    isActive: true,
    isDefault: false,
  };

  const doc = new LeaveTypeModel({ ...defaults, ...overrides });
  return doc.save();
}

// ----------------------------------------------------------------
// LeaveRequest factory
// ----------------------------------------------------------------

type LeaveRequestOverrides = Partial<
  Pick<
    ILeaveRequest,
    | "startDate"
    | "endDate"
    | "workingDays"
    | "reason"
    | "status"
    | "halfDayStart"
    | "halfDayEnd"
  >
>;

/**
 * Creates and saves a leave request for the given tenant and employee.
 * A minimal workflow snapshot is embedded automatically.
 */
export async function createTestLeaveRequest(
  tenantId: string,
  employeeId: string | mongoose.Types.ObjectId,
  overrides: LeaveRequestOverrides = {}
): Promise<ILeaveRequest> {
  const leaveType = await createTestLeaveType(tenantId);
  const workflow = await createTestWorkflow(tenantId);

  const startDate = overrides.startDate ?? new Date("2025-03-10");
  const endDate = overrides.endDate ?? new Date("2025-03-12");

  const workflowSnapshot: ILeaveRequest["workflowSnapshot"] = {
    workflowId: workflow._id as mongoose.Types.ObjectId,
    workflowVersion: 1,
    name: workflow.name,
    steps: workflow.steps,
  };

  const defaults = {
    tenantId,
    employeeId: new mongoose.Types.ObjectId(String(employeeId)),
    leaveTypeId: leaveType._id as mongoose.Types.ObjectId,
    startDate,
    endDate,
    halfDayStart: false,
    halfDayEnd: false,
    workingDays: 3,
    reason: null,
    status: "pending_approval" as ILeaveRequest["status"],
    currentStep: 0,
    workflowSnapshot,
  };

  const doc = new LeaveRequestModel({ ...defaults, ...overrides });
  return doc.save();
}

// ----------------------------------------------------------------
// BalanceLedger factory
// ----------------------------------------------------------------

type LedgerOverrides = Partial<
  Pick<
    IBalanceLedger,
    | "entryType"
    | "amount"
    | "effectiveDate"
    | "description"
    | "fiscalYear"
    | "referenceType"
    | "isCarryover"
  >
>;

/**
 * Creates and saves a balance ledger entry for the given tenant, employee,
 * and leave type.
 */
export async function createTestLedgerEntry(
  tenantId: string,
  employeeId: string | mongoose.Types.ObjectId,
  leaveTypeId: string | mongoose.Types.ObjectId,
  overrides: LedgerOverrides = {}
): Promise<IBalanceLedger> {
  const defaults = {
    tenantId,
    employeeId: new mongoose.Types.ObjectId(String(employeeId)),
    leaveTypeId: new mongoose.Types.ObjectId(String(leaveTypeId)),
    entryType: "initial_allocation" as IBalanceLedger["entryType"],
    amount: 20,
    effectiveDate: new Date("2025-01-01"),
    description: "Initial annual leave allocation",
    referenceType: "system" as IBalanceLedger["referenceType"],
    referenceId: null,
    actorId: null,
    fiscalYear: 2025,
    isCarryover: false,
  };

  const doc = new BalanceLedgerModel({ ...defaults, ...overrides });
  return doc.save();
}
