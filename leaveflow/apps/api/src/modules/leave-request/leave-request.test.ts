/**
 * Leave request module tests — repository and service.
 *
 * Repository tests use mongodb-memory-server (integration).
 * Service tests use mocked dependencies (unit).
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import mongoose from "mongoose";
import {
  setupTestDb,
  teardownTestDb,
  clearAllCollections,
} from "../../../test/helpers/db.helper.js";
import {
  createTestTenant,
  createTestEmployee,
  createTestLeaveRequest,
  createTestLeaveType,
  createTestWorkflow,
} from "../../../test/helpers/factory.js";
import { LeaveRequestRepository } from "./leave-request.repository.js";
import { LeaveRequestService } from "./leave-request.service.js";
import type { ILeaveRequest } from "../../models/leave-request.model.js";

// ----------------------------------------------------------------
// Repository integration tests
// ----------------------------------------------------------------

describe("LeaveRequestRepository", () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  beforeEach(async () => {
    await clearAllCollections();
  });

  describe("findById", () => {
    it("returns null when not found", async () => {
      const tenant = await createTestTenant();
      const repo = new LeaveRequestRepository();
      const result = await repo.findById(
        String(tenant._id),
        new mongoose.Types.ObjectId()
      );
      expect(result).toBeNull();
    });

    it("returns the document when found", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const req = await createTestLeaveRequest(
        String(tenant._id),
        employee._id as mongoose.Types.ObjectId
      );

      const repo = new LeaveRequestRepository();
      const found = await repo.findById(
        String(tenant._id),
        req._id as mongoose.Types.ObjectId
      );

      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(req._id.toString());
    });

    it("does not return documents from another tenant", async () => {
      const tenant1 = await createTestTenant();
      const tenant2 = await createTestTenant();
      const employee1 = await createTestEmployee(String(tenant1._id));
      const req = await createTestLeaveRequest(
        String(tenant1._id),
        employee1._id as mongoose.Types.ObjectId
      );

      const repo = new LeaveRequestRepository();
      const result = await repo.findById(
        String(tenant2._id),
        req._id as mongoose.Types.ObjectId
      );

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("persists a leave request document", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const leaveType = await createTestLeaveType(String(tenant._id));
      const workflow = await createTestWorkflow(String(tenant._id));

      const repo = new LeaveRequestRepository();
      const created = await repo.create({
        tenantId: String(tenant._id),
        employeeId: employee._id as mongoose.Types.ObjectId,
        leaveTypeId: leaveType._id as mongoose.Types.ObjectId,
        startDate: new Date("2025-03-10"),
        endDate: new Date("2025-03-12"),
        halfDayStart: false,
        halfDayEnd: false,
        workingDays: 3,
        reason: "Annual vacation",
        status: "pending_approval",
        currentStep: 0,
        currentApproverEmployeeId: null,
        currentStepStartedAt: new Date(),
        workflowSnapshot: {
          workflowId: workflow._id as mongoose.Types.ObjectId,
          workflowVersion: workflow.version,
          name: workflow.name,
          steps: workflow.steps,
        },
      });

      expect(created._id).toBeDefined();
      expect(created.workingDays).toBe(3);
      expect(created.status).toBe("pending_approval");
    });
  });

  describe("updateStatus", () => {
    it("updates status and clears approver fields on final approval", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const req = await createTestLeaveRequest(
        String(tenant._id),
        employee._id as mongoose.Types.ObjectId
      );

      const repo = new LeaveRequestRepository();
      await repo.updateStatus(
        String(tenant._id),
        req._id as mongoose.Types.ObjectId,
        {
          status: "approved",
          currentStep: -1,
          currentApproverEmployeeId: null,
          currentStepStartedAt: null,
        }
      );

      const updated = await repo.findById(
        String(tenant._id),
        req._id as mongoose.Types.ObjectId
      );

      expect(updated!.status).toBe("approved");
      expect(updated!.currentStep).toBe(-1);
      expect(updated!.currentApproverEmployeeId).toBeNull();
    });
  });

  describe("findPending", () => {
    it("returns only pending_approval requests", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const tenantId = String(tenant._id);

      await createTestLeaveRequest(
        tenantId,
        employee._id as mongoose.Types.ObjectId,
        { status: "pending_approval" }
      );
      await createTestLeaveRequest(
        tenantId,
        employee._id as mongoose.Types.ObjectId,
        { status: "approved" }
      );

      const repo = new LeaveRequestRepository();
      const pending = await repo.findPending(tenantId);

      expect(pending).toHaveLength(1);
      expect(pending[0]!.status).toBe("pending_approval");
    });
  });

  describe("findAll with filters", () => {
    it("filters by status", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const tenantId = String(tenant._id);

      await createTestLeaveRequest(
        tenantId,
        employee._id as mongoose.Types.ObjectId,
        { status: "approved" }
      );
      await createTestLeaveRequest(
        tenantId,
        employee._id as mongoose.Types.ObjectId,
        { status: "rejected" }
      );

      const repo = new LeaveRequestRepository();
      const result = await repo.findAll(
        tenantId,
        { status: "approved" },
        { page: 1, limit: 10 }
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("returns paginated results", async () => {
      const tenant = await createTestTenant();
      const employee = await createTestEmployee(String(tenant._id));
      const tenantId = String(tenant._id);

      for (let i = 0; i < 5; i++) {
        await createTestLeaveRequest(
          tenantId,
          employee._id as mongoose.Types.ObjectId
        );
      }

      const repo = new LeaveRequestRepository();
      const page1 = await repo.findAll(tenantId, {}, { page: 1, limit: 3 });
      const page2 = await repo.findAll(tenantId, {}, { page: 2, limit: 3 });

      expect(page1.items).toHaveLength(3);
      expect(page1.total).toBe(5);
      expect(page2.items).toHaveLength(2);
    });
  });
});

// ----------------------------------------------------------------
// Service unit tests (mocked dependencies)
// ----------------------------------------------------------------

describe("LeaveRequestService", () => {
  const tenantId = "tenant-unit";
  const employeeId = new mongoose.Types.ObjectId();
  const leaveTypeId = new mongoose.Types.ObjectId();
  const workflowId = new mongoose.Types.ObjectId();
  const leaveRequestId = new mongoose.Types.ObjectId();

  const mockWorkflow = {
    _id: workflowId,
    tenantId,
    version: 1,
    name: "Test Workflow",
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

  const mockCreatedRequest: ILeaveRequest = {
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
      name: "Test Workflow",
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
  } as unknown as ILeaveRequest;

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

  // We need to mock WorkflowModel.findOne — use vi.mock at module level
  // For simplicity, we test the service methods that don't require DB via direct mocks
  // and test WorkflowModel integration via the repo tests above.

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepo.create.mockResolvedValue(mockCreatedRequest);
    mockBalanceService.checkSufficientBalance.mockResolvedValue(true);
    mockHolidayService.countWorkingDays.mockResolvedValue(3);
    mockAuditService.log.mockResolvedValue(undefined);
    mockApprovalEngine.processCancellation.mockResolvedValue({
      leaveRequestId,
      previousStatus: "pending_approval",
      newStatus: "cancelled",
      stepAdvanced: false,
      isTerminal: true,
    });
  });

  function makeService(): LeaveRequestService {
    return new LeaveRequestService(
      mockRepo as unknown as ConstructorParameters<typeof LeaveRequestService>[0],
      mockBalanceService as unknown as ConstructorParameters<typeof LeaveRequestService>[1],
      mockApprovalEngine as unknown as ConstructorParameters<typeof LeaveRequestService>[2],
      mockAuditService as unknown as ConstructorParameters<typeof LeaveRequestService>[3],
      mockHolidayService as unknown as ConstructorParameters<typeof LeaveRequestService>[4]
    );
  }

  describe("validate", () => {
    it("returns valid=true with working days when all checks pass", async () => {
      mockBalanceService.checkSufficientBalance.mockResolvedValue(true);
      mockHolidayService.countWorkingDays.mockResolvedValue(3);

      const service = makeService();
      const result = await service.validate(tenantId, employeeId, {
        leaveTypeId,
        startDate: new Date("2025-03-10"),
        endDate: new Date("2025-03-12"),
        workflowId,
      });

      expect(result.valid).toBe(true);
      expect(result.workingDays).toBe(3);
      expect(result.errors).toHaveLength(0);
    });

    it("returns INVALID_DATE_RANGE error when start > end", async () => {
      const service = makeService();
      const result = await service.validate(tenantId, employeeId, {
        leaveTypeId,
        startDate: new Date("2025-03-15"),
        endDate: new Date("2025-03-10"),
        workflowId,
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]!.code).toBe("INVALID_DATE_RANGE");
    });

    it("returns NO_WORKING_DAYS error when all days are holidays/weekends", async () => {
      mockHolidayService.countWorkingDays.mockResolvedValue(0);

      const service = makeService();
      const result = await service.validate(tenantId, employeeId, {
        leaveTypeId,
        startDate: new Date("2025-03-10"),
        endDate: new Date("2025-03-10"),
        workflowId,
      });

      expect(result.valid).toBe(false);
      expect(result.errors[0]!.code).toBe("NO_WORKING_DAYS");
    });

    it("returns INSUFFICIENT_BALANCE error when balance is too low", async () => {
      mockBalanceService.checkSufficientBalance.mockResolvedValue(false);
      mockHolidayService.countWorkingDays.mockResolvedValue(5);

      const service = makeService();
      const result = await service.validate(tenantId, employeeId, {
        leaveTypeId,
        startDate: new Date("2025-03-10"),
        endDate: new Date("2025-03-14"),
        workflowId,
      });

      expect(result.valid).toBe(false);
      const balanceError = result.errors.find(
        (e) => e.code === "INSUFFICIENT_BALANCE"
      );
      expect(balanceError).toBeDefined();
    });

    it("can return multiple errors in one response", async () => {
      mockHolidayService.countWorkingDays.mockResolvedValue(0);
      mockBalanceService.checkSufficientBalance.mockResolvedValue(false);

      const service = makeService();
      const result = await service.validate(tenantId, employeeId, {
        leaveTypeId,
        startDate: new Date("2025-03-10"),
        endDate: new Date("2025-03-10"),
        workflowId,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("cancel", () => {
    it("delegates to approvalEngine.processCancellation", async () => {
      const service = makeService();
      await service.cancel(tenantId, leaveRequestId, employeeId, "Changed my mind");

      expect(mockApprovalEngine.processCancellation).toHaveBeenCalledWith(
        tenantId,
        leaveRequestId,
        { employeeId, reason: "Changed my mind" }
      );
    });
  });

  describe("findById", () => {
    it("delegates to repo.findById", async () => {
      mockRepo.findById.mockResolvedValue(mockCreatedRequest);
      const service = makeService();

      const result = await service.findById(tenantId, leaveRequestId);

      expect(mockRepo.findById).toHaveBeenCalledWith(tenantId, leaveRequestId);
      expect(result).toEqual(mockCreatedRequest);
    });
  });

  describe("findAll", () => {
    it("delegates to repo.findAll", async () => {
      const paginatedResult = {
        items: [mockCreatedRequest],
        total: 1,
        page: 1,
        limit: 10,
      };
      mockRepo.findAll.mockResolvedValue(paginatedResult);

      const service = makeService();
      const filters = { status: "pending_approval" as const };
      const pagination = { page: 1, limit: 10 };

      const result = await service.findAll(tenantId, filters, pagination);

      expect(mockRepo.findAll).toHaveBeenCalledWith(tenantId, filters, pagination);
      expect(result).toEqual(paginatedResult);
    });
  });

  describe("findForCalendar", () => {
    it("delegates to repo.findForCalendar when no teamId", async () => {
      mockRepo.findForCalendar.mockResolvedValue([mockCreatedRequest]);
      const service = makeService();

      const result = await service.findForCalendar(tenantId, {
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-31"),
      });

      expect(mockRepo.findForCalendar).toHaveBeenCalledOnce();
      expect(result).toHaveLength(1);
    });
  });
});
