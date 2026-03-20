/**
 * LeaveRequestService.create — unit tests.
 *
 * Tests the Redis distributed lock behavior (CR-005) and happy-path creation.
 * All external dependencies (WorkflowModel, redis, repo, balanceService) are mocked.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Hoist mocks so they are available inside vi.mock factory closures
// ---------------------------------------------------------------------------

const { mockRedisSet, mockRedisDel, mockWorkflowFindOne } = vi.hoisted(() => ({
  mockRedisSet: vi.fn(),
  mockRedisDel: vi.fn(),
  mockWorkflowFindOne: vi.fn(),
}));

vi.mock("../../lib/redis.js", () => ({
  getRedisClient: () => ({
    set: mockRedisSet,
    del: mockRedisDel,
  }),
}));

vi.mock("../../models/index.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../models/index.js")>();
  return {
    ...actual,
    WorkflowModel: { findOne: mockWorkflowFindOne },
    EmployeeModel: actual.EmployeeModel,
  };
});

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import { LeaveRequestService } from "./leave-request.service.js";
import { ConflictError } from "../../lib/errors.js";

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

const tenantId = "tenant-create-test";
const employeeId = new mongoose.Types.ObjectId();
const leaveTypeId = new mongoose.Types.ObjectId();
const workflowId = new mongoose.Types.ObjectId();
const leaveRequestId = new mongoose.Types.ObjectId();

const mockWorkflow = {
  _id: workflowId,
  tenantId,
  version: 1,
  name: "Default Workflow",
  isActive: true,
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
  ],
  autoApprovalRules: [],
};

const mockCreatedRequest = {
  _id: leaveRequestId,
  tenantId,
  employeeId,
  leaveTypeId,
  startDate: new Date("2025-03-10"),
  endDate: new Date("2025-03-12"),
  halfDayStart: false,
  halfDayEnd: false,
  workingDays: 3,
  reason: null,
  status: "pending_approval",
  currentStep: 0,
  reminderCount: 0,
  currentApproverEmployeeId: null,
  currentStepStartedAt: new Date(),
  workflowSnapshot: {
    workflowId,
    workflowVersion: 1,
    name: "Default Workflow",
    steps: mockWorkflow.steps,
  },
  autoApprovalRuleName: null,
  approvalHistory: [],
  cancellationReason: null,
  cancelledAt: null,
  cancelledBy: null,
  calendarEventIds: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockRepo = {
  findById: vi.fn(),
  findAll: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  findPending: vi.fn(),
  findByEmployee: vi.fn(),
  findForCalendar: vi.fn(),
};

const mockBalanceService = {
  checkSufficientBalance: vi.fn(),
  deduct: vi.fn(),
  restore: vi.fn(),
  getEmployeeBalances: vi.fn(),
  allocateInitial: vi.fn(),
  accrue: vi.fn(),
  adjustManual: vi.fn(),
};

const mockApprovalEngine = {
  processApproval: vi.fn(),
  processRejection: vi.fn(),
  processCancellation: vi.fn(),
  processEscalation: vi.fn(),
  checkAutoApproval: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

const mockHolidayService = {
  countWorkingDays: vi.fn(),
};

function makeService(): LeaveRequestService {
  return new LeaveRequestService(
    mockRepo as unknown as ConstructorParameters<typeof LeaveRequestService>[0],
    mockBalanceService as unknown as ConstructorParameters<typeof LeaveRequestService>[1],
    mockApprovalEngine as unknown as ConstructorParameters<typeof LeaveRequestService>[2],
    mockAuditService as unknown as ConstructorParameters<typeof LeaveRequestService>[3],
    mockHolidayService as unknown as ConstructorParameters<typeof LeaveRequestService>[4]
  );
}

const createInput = {
  leaveTypeId,
  startDate: new Date("2025-03-10"),
  endDate: new Date("2025-03-12"),
  halfDayStart: false as const,
  halfDayEnd: false as const,
  reason: null,
  workflowId,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LeaveRequestService.create — Redis lock (CR-005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Workflow resolves successfully by default
    mockWorkflowFindOne.mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockWorkflow),
    });

    // Balance check passes by default
    mockBalanceService.checkSufficientBalance.mockResolvedValue(true);
    mockHolidayService.countWorkingDays.mockResolvedValue(3);
    mockRepo.create.mockResolvedValue(mockCreatedRequest);
    mockAuditService.log.mockResolvedValue(undefined);

    // Redis lock acquired (SET returns "OK") by default
    mockRedisSet.mockResolvedValue("OK");
    mockRedisDel.mockResolvedValue(1);
  });

  it("acquires the lock before balance check and releases it after creation", async () => {
    const service = makeService();
    await service.create(tenantId, employeeId, createInput);

    // Lock acquired with correct key pattern and NX/EX options
    expect(mockRedisSet).toHaveBeenCalledWith(
      `lock:balance:${tenantId}:${employeeId.toString()}:${leaveTypeId.toString()}`,
      "1",
      "EX",
      10,
      "NX"
    );

    // Lock released after successful creation
    expect(mockRedisDel).toHaveBeenCalledWith(
      `lock:balance:${tenantId}:${employeeId.toString()}:${leaveTypeId.toString()}`
    );
  });

  it("throws ConflictError when lock cannot be acquired (concurrent request)", async () => {
    // SET NX returns null when key already exists
    mockRedisSet.mockResolvedValue(null);

    const service = makeService();
    await expect(
      service.create(tenantId, employeeId, createInput)
    ).rejects.toThrow(ConflictError);

    await expect(
      service.create(tenantId, employeeId, createInput)
    ).rejects.toThrow("Another leave request is being processed, please try again");
  });

  it("releases the lock in the finally block even when balance check throws", async () => {
    mockBalanceService.checkSufficientBalance.mockRejectedValue(
      new Error("Balance service unavailable")
    );

    const service = makeService();
    await expect(
      service.create(tenantId, employeeId, createInput)
    ).rejects.toThrow("Balance service unavailable");

    // Lock must still be released
    expect(mockRedisDel).toHaveBeenCalledOnce();
  });

  it("releases the lock in the finally block even when repo.create throws", async () => {
    mockRepo.create.mockRejectedValue(new Error("Database write failed"));

    const service = makeService();
    await expect(
      service.create(tenantId, employeeId, createInput)
    ).rejects.toThrow("Database write failed");

    expect(mockRedisDel).toHaveBeenCalledOnce();
  });

  it("returns the created leave request on success", async () => {
    const service = makeService();
    const result = await service.create(tenantId, employeeId, createInput);

    expect(result).toEqual(mockCreatedRequest);
    expect(mockRepo.create).toHaveBeenCalledOnce();
    expect(mockAuditService.log).toHaveBeenCalledOnce();
  });

  it("throws when balance is insufficient", async () => {
    mockBalanceService.checkSufficientBalance.mockResolvedValue(false);

    const service = makeService();
    await expect(
      service.create(tenantId, employeeId, createInput)
    ).rejects.toThrow("Insufficient balance");

    // Lock must be released even on validation failure
    expect(mockRedisDel).toHaveBeenCalledOnce();
  });
});
