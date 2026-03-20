/**
 * Integration tests for P1-T01: Cross-tenant data isolation.
 *
 * Verifies that documents created under tenant A cannot be read
 * by queries scoped to tenant B, across all key tenant-scoped collections.
 *
 * Collections tested:
 *   1. employees
 *   2. teams
 *   3. leave_types
 *   4. workflows
 *   5. leave_requests
 *
 * Prerequisites: mongodb-memory-server is started by setupTestDb().
 */

import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDb,
  teardownTestDb,
  clearAllCollections,
} from "../helpers/db.helper.js";
import {
  createTestTenant,
  createTestEmployee,
  createTestTeam,
  createTestLeaveType,
  createTestWorkflow,
  createTestLeaveRequest,
} from "../helpers/factory.js";
import {
  EmployeeModel,
  TeamModel,
  LeaveTypeModel,
  WorkflowModel,
  LeaveRequestModel,
} from "../../src/models/index.js";
import { withTenant } from "../../src/lib/tenant-scope.js";

beforeAll(async () => {
  await setupTestDb();
});

afterAll(async () => {
  await teardownTestDb();
});

beforeEach(async () => {
  await clearAllCollections();
});

// ============================================================
// Helpers
// ============================================================

async function setupTwoTenants() {
  const tenantA = await createTestTenant({ name: "Tenant A", slug: "tenant-a" });
  const tenantB = await createTestTenant({ name: "Tenant B", slug: "tenant-b" });
  return {
    tenantAId: String(tenantA._id),
    tenantBId: String(tenantB._id),
  };
}

// ============================================================
// 1. Employees
// ============================================================

describe("Tenant isolation — employees collection", () => {
  it("employee created in tenant A is not visible when querying tenant B", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestEmployee(tenantAId, { email: "alice@a.com" });
    await createTestEmployee(tenantAId, { email: "bob@a.com" });

    const resultB = await EmployeeModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultB).toHaveLength(0);
  });

  it("each tenant sees only its own employees", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestEmployee(tenantAId, { email: "alice@a.com" });
    await createTestEmployee(tenantBId, { email: "carol@b.com" });
    await createTestEmployee(tenantBId, { email: "dave@b.com" });

    const resultA = await EmployeeModel.find(
      withTenant(tenantAId, {})
    ).lean().exec();
    const resultB = await EmployeeModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultA).toHaveLength(1);
    expect(resultB).toHaveLength(2);
  });

  it("findOne scoped to tenant B cannot retrieve a document from tenant A", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const emp = await createTestEmployee(tenantAId, { email: "alice@a.com" });

    const found = await EmployeeModel.findOne(
      withTenant(tenantBId, { _id: emp._id })
    ).lean().exec();

    expect(found).toBeNull();
  });
});

// ============================================================
// 2. Teams
// ============================================================

describe("Tenant isolation — teams collection", () => {
  it("team created in tenant A is not visible when querying tenant B", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestTeam(tenantAId, { name: "Alpha Team" });

    const resultB = await TeamModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultB).toHaveLength(0);
  });

  it("each tenant sees only its own teams", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestTeam(tenantAId, { name: "Alpha Team" });
    await createTestTeam(tenantAId, { name: "Beta Team" });
    await createTestTeam(tenantBId, { name: "Gamma Team" });

    const resultA = await TeamModel.find(
      withTenant(tenantAId, {})
    ).lean().exec();
    const resultB = await TeamModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultA).toHaveLength(2);
    expect(resultB).toHaveLength(1);
  });

  it("findOne scoped to tenant B cannot retrieve a team from tenant A", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const team = await createTestTeam(tenantAId, { name: "Secret Team" });

    const found = await TeamModel.findOne(
      withTenant(tenantBId, { _id: team._id })
    ).lean().exec();

    expect(found).toBeNull();
  });
});

// ============================================================
// 3. Leave Types
// ============================================================

describe("Tenant isolation — leave_types collection", () => {
  it("leave type created in tenant A is not visible when querying tenant B", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestLeaveType(tenantAId, { name: "Annual Leave", slug: "annual" });

    const resultB = await LeaveTypeModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultB).toHaveLength(0);
  });

  it("each tenant sees only its own leave types", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestLeaveType(tenantAId, { name: "Annual Leave", slug: "annual-a" });
    await createTestLeaveType(tenantAId, { name: "Sick Leave", slug: "sick-a" });
    await createTestLeaveType(tenantBId, { name: "Annual Leave", slug: "annual-b" });

    const resultA = await LeaveTypeModel.find(
      withTenant(tenantAId, {})
    ).lean().exec();
    const resultB = await LeaveTypeModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultA).toHaveLength(2);
    expect(resultB).toHaveLength(1);
  });

  it("findOne scoped to tenant B cannot retrieve a leave type from tenant A", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const lt = await createTestLeaveType(tenantAId, {
      name: "Private Leave",
      slug: "private-a",
    });

    const found = await LeaveTypeModel.findOne(
      withTenant(tenantBId, { _id: lt._id })
    ).lean().exec();

    expect(found).toBeNull();
  });
});

// ============================================================
// 4. Workflows
// ============================================================

describe("Tenant isolation — workflows collection", () => {
  it("workflow created in tenant A is not visible when querying tenant B", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestWorkflow(tenantAId, { name: "A Standard Approval" });

    const resultB = await WorkflowModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultB).toHaveLength(0);
  });

  it("each tenant sees only its own workflows", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();

    await createTestWorkflow(tenantAId, { name: "Workflow A1" });
    await createTestWorkflow(tenantBId, { name: "Workflow B1" });
    await createTestWorkflow(tenantBId, { name: "Workflow B2" });

    const resultA = await WorkflowModel.find(
      withTenant(tenantAId, {})
    ).lean().exec();
    const resultB = await WorkflowModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultA).toHaveLength(1);
    expect(resultB).toHaveLength(2);
  });

  it("findOne scoped to tenant B cannot retrieve a workflow from tenant A", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const wf = await createTestWorkflow(tenantAId, { name: "Secret Workflow" });

    const found = await WorkflowModel.findOne(
      withTenant(tenantBId, { _id: wf._id })
    ).lean().exec();

    expect(found).toBeNull();
  });
});

// ============================================================
// 5. Leave Requests
// ============================================================

describe("Tenant isolation — leave_requests collection", () => {
  it("leave request created in tenant A is not visible when querying tenant B", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const empA = await createTestEmployee(tenantAId);

    await createTestLeaveRequest(tenantAId, empA._id);

    const resultB = await LeaveRequestModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultB).toHaveLength(0);
  });

  it("each tenant sees only its own leave requests", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const empA = await createTestEmployee(tenantAId);
    const empB = await createTestEmployee(tenantBId);

    await createTestLeaveRequest(tenantAId, empA._id);
    await createTestLeaveRequest(tenantBId, empB._id);
    await createTestLeaveRequest(tenantBId, empB._id);

    const resultA = await LeaveRequestModel.find(
      withTenant(tenantAId, {})
    ).lean().exec();
    const resultB = await LeaveRequestModel.find(
      withTenant(tenantBId, {})
    ).lean().exec();

    expect(resultA).toHaveLength(1);
    // Tenant B has 2 leave requests but each createTestLeaveRequest
    // also creates a workflow and leave type, so we just check >= 2
    expect(resultB).toHaveLength(2);
  });

  it("findOne scoped to tenant B cannot retrieve a leave request from tenant A", async () => {
    const { tenantAId, tenantBId } = await setupTwoTenants();
    const empA = await createTestEmployee(tenantAId);
    const lr = await createTestLeaveRequest(tenantAId, empA._id);

    const found = await LeaveRequestModel.findOne(
      withTenant(tenantBId, { _id: lr._id })
    ).lean().exec();

    expect(found).toBeNull();
  });

  it("withTenant utility returns a new object without mutating the original filter", () => {
    const original = { isActive: true };
    const scoped = withTenant("tenant-abc", original);

    // Returns new object
    expect(scoped).not.toBe(original);
    // Contains tenantId
    expect(scoped["tenantId"]).toBe("tenant-abc");
    expect(scoped["isActive"]).toBe(true);
    // Original is untouched
    expect(original).not.toHaveProperty("tenantId");
  });
});
