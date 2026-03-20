/**
 * Accrual worker tests.
 *
 * Tests the accrual calculation logic and batch-insert behavior using mocked dependencies.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  processAccrualJob,
  calculateAccrualAmount,
  type AccrualWorkerDeps,
} from "./accrual.worker.js";
import type { AccrualJobData } from "../lib/bullmq.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeObjectId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function makeLeaveType(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    name: "Annual Leave",
    defaultEntitlementDays: 20,
    accrualRule: {
      type: "monthly" as const,
      dayOfMonth: 1,
      customSchedule: null,
    },
    carryoverRule: {
      enabled: false,
      maxDays: null,
      expiryMonths: null,
    },
    isActive: true,
    ...overrides,
  };
}

function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    status: "active" as const,
    startDate: new Date("2024-01-01"),
    ...overrides,
  };
}

function makeDeps(overrides: Partial<AccrualWorkerDeps> = {}): AccrualWorkerDeps {
  const leaveTypeId = makeObjectId();
  const employeeId = makeObjectId();

  return {
    leaveTypeModel: {
      findById: vi.fn().mockResolvedValue(makeLeaveType({ _id: leaveTypeId })),
    },
    employeeModel: {
      find: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([makeEmployee({ _id: employeeId })]),
      }),
    },
    balanceLedgerModel: {
      insertMany: vi.fn().mockResolvedValue([]),
    },
    auditService: {
      log: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("calculateAccrualAmount", () => {
  it("returns monthly amount for monthly accrual (yearly / 12)", () => {
    const amount = calculateAccrualAmount(
      { type: "monthly", dayOfMonth: 1, customSchedule: null },
      20,
      new Date("2025-03-01")
    );
    expect(amount).toBeCloseTo(20 / 12, 5);
  });

  it("returns quarterly amount for quarterly accrual (yearly / 4)", () => {
    const amount = calculateAccrualAmount(
      { type: "quarterly", dayOfMonth: null, customSchedule: null },
      20,
      new Date("2025-03-01")
    );
    expect(amount).toBeCloseTo(20 / 4, 5);
  });

  it("returns 0 for front_loaded accrual (not monthly)", () => {
    const amount = calculateAccrualAmount(
      { type: "front_loaded", dayOfMonth: null, customSchedule: null },
      20,
      new Date("2025-03-01")
    );
    expect(amount).toBe(0);
  });

  it("returns 0 for none accrual type", () => {
    const amount = calculateAccrualAmount(
      { type: "none", dayOfMonth: null, customSchedule: null },
      20,
      new Date("2025-03-01")
    );
    expect(amount).toBe(0);
  });

  it("applies probation reduction for new hires (less than 3 months)", () => {
    const recentStartDate = new Date();
    recentStartDate.setMonth(recentStartDate.getMonth() - 1); // 1 month ago

    const amount = calculateAccrualAmount(
      { type: "monthly", dayOfMonth: 1, customSchedule: null },
      20,
      new Date(),
      recentStartDate
    );
    // Probation: 50% accrual
    expect(amount).toBeCloseTo((20 / 12) * 0.5, 5);
  });

  it("does not apply probation reduction for tenured employees", () => {
    const oldStartDate = new Date("2020-01-01");
    const fullAmount = 20 / 12;

    const amount = calculateAccrualAmount(
      { type: "monthly", dayOfMonth: 1, customSchedule: null },
      20,
      new Date(),
      oldStartDate
    );
    expect(amount).toBeCloseTo(fullAmount, 5);
  });
});

describe("processAccrualJob", () => {
  const TENANT_ID = "tenant-a";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when leave type is not found", async () => {
    const deps = makeDeps({
      leaveTypeModel: {
        findById: vi.fn().mockResolvedValue(null),
      },
    });

    const jobData: AccrualJobData = {
      tenantId: TENANT_ID,
      leaveTypeId: makeObjectId().toString(),
      effectiveDate: "2025-03-01",
    };

    await processAccrualJob(jobData, deps);

    expect(deps.balanceLedgerModel.insertMany).not.toHaveBeenCalled();
  });

  it("does nothing when leave type has accrual type 'none'", async () => {
    const deps = makeDeps({
      leaveTypeModel: {
        findById: vi.fn().mockResolvedValue(
          makeLeaveType({ accrualRule: { type: "none", dayOfMonth: null, customSchedule: null } })
        ),
      },
    });

    const jobData: AccrualJobData = {
      tenantId: TENANT_ID,
      leaveTypeId: makeObjectId().toString(),
      effectiveDate: "2025-03-01",
    };

    await processAccrualJob(jobData, deps);

    expect(deps.balanceLedgerModel.insertMany).not.toHaveBeenCalled();
  });

  it("batch-inserts accrual entries for all active employees in a single call", async () => {
    const emp1 = makeEmployee();
    const emp2 = makeEmployee();

    const deps = makeDeps({
      employeeModel: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([emp1, emp2]),
        }),
      },
    });

    const jobData: AccrualJobData = {
      tenantId: TENANT_ID,
      leaveTypeId: makeObjectId().toString(),
      effectiveDate: "2025-03-01",
    };

    await processAccrualJob(jobData, deps);

    // Single insertMany call (not one per employee)
    expect(deps.balanceLedgerModel.insertMany).toHaveBeenCalledTimes(1);
    const [entries] = (deps.balanceLedgerModel.insertMany as ReturnType<typeof vi.fn>).mock.calls[0] as [unknown[]];
    expect(entries).toHaveLength(2);
  });

  it("inserts entries with correct tenantId, employeeId, and leaveTypeId", async () => {
    const emp = makeEmployee();
    const leaveType = makeLeaveType();

    const deps = makeDeps({
      leaveTypeModel: {
        findById: vi.fn().mockResolvedValue(leaveType),
      },
      employeeModel: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([emp]),
        }),
      },
    });

    const jobData: AccrualJobData = {
      tenantId: TENANT_ID,
      leaveTypeId: leaveType._id.toString(),
      effectiveDate: "2025-03-01",
    };

    await processAccrualJob(jobData, deps);

    expect(deps.balanceLedgerModel.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tenantId: TENANT_ID,
          employeeId: emp._id,
          leaveTypeId: leaveType._id,
          entryType: "accrual",
          fiscalYear: 2025,
        }),
      ])
    );
  });

  it("skips employees with zero accrual amount and does not call insertMany", async () => {
    const emp = makeEmployee();
    const deps = makeDeps({
      leaveTypeModel: {
        findById: vi.fn().mockResolvedValue(
          makeLeaveType({ accrualRule: { type: "none", dayOfMonth: null, customSchedule: null } })
        ),
      },
      employeeModel: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([emp]),
        }),
      },
    });

    const jobData: AccrualJobData = {
      tenantId: TENANT_ID,
      leaveTypeId: makeObjectId().toString(),
      effectiveDate: "2025-03-01",
    };

    await processAccrualJob(jobData, deps);

    expect(deps.balanceLedgerModel.insertMany).not.toHaveBeenCalled();
  });

  it("writes a single batch audit log entry with employeeCount metadata", async () => {
    const emp1 = makeEmployee();
    const emp2 = makeEmployee();
    const leaveType = makeLeaveType({
      carryoverRule: {
        enabled: true,
        maxDays: 5,
        expiryMonths: null,
      },
    });

    const deps = makeDeps({
      leaveTypeModel: {
        findById: vi.fn().mockResolvedValue(leaveType),
      },
      employeeModel: {
        find: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([emp1, emp2]),
        }),
      },
    });

    const jobData: AccrualJobData = {
      tenantId: TENANT_ID,
      leaveTypeId: leaveType._id.toString(),
      effectiveDate: "2025-01-01",
    };

    await processAccrualJob(jobData, deps);

    // Single audit log, not one per employee
    expect(deps.auditService!.log).toHaveBeenCalledTimes(1);
    expect(deps.auditService!.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "balance.accrual_batch",
        metadata: expect.objectContaining({ employeeCount: 2 }),
      })
    );
  });
});
