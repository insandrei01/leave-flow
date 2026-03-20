/**
 * Approval engine tests — FSM and service.
 *
 * FSM tests are pure unit tests (no DB).
 * Service tests use mocked repository, balance service, and audit service.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  vi,
} from "vitest";
import mongoose from "mongoose";
import {
  transition,
  isTerminal,
  canTransition,
  InvalidTransitionError,
} from "./approval-engine.fsm.js";
import { ApprovalEngineService } from "./approval-engine.service.js";
import type { ILeaveRequest } from "../../models/leave-request.model.js";
import type { LeaveRequestStatus } from "../../models/leave-request.model.js";

// ----------------------------------------------------------------
// FSM unit tests
// ----------------------------------------------------------------

describe("approval-engine FSM", () => {
  describe("transition", () => {
    it("pending_validation -> pending_approval on validation_passed", () => {
      expect(transition("pending_validation", "validation_passed")).toBe(
        "pending_approval"
      );
    });

    it("pending_validation -> validation_failed on validation_failed", () => {
      expect(transition("pending_validation", "validation_failed")).toBe(
        "validation_failed"
      );
    });

    it("pending_approval -> approved on approve", () => {
      expect(transition("pending_approval", "approve")).toBe("approved");
    });

    it("pending_approval -> rejected on reject", () => {
      expect(transition("pending_approval", "reject")).toBe("rejected");
    });

    it("pending_approval -> cancelled on cancel", () => {
      expect(transition("pending_approval", "cancel")).toBe("cancelled");
    });

    it("pending_approval -> auto_approved on auto_approve", () => {
      expect(transition("pending_approval", "auto_approve")).toBe("auto_approved");
    });

    it("pending_approval -> pending_approval on escalate", () => {
      expect(transition("pending_approval", "escalate")).toBe("pending_approval");
    });

    it("approved -> cancelled on cancel", () => {
      expect(transition("approved", "cancel")).toBe("cancelled");
    });

    it("auto_approved -> cancelled on cancel", () => {
      expect(transition("auto_approved", "cancel")).toBe("cancelled");
    });

    it("throws InvalidTransitionError for invalid transitions", () => {
      expect(() => transition("approved", "approve")).toThrow(
        InvalidTransitionError
      );
      expect(() => transition("rejected", "approve")).toThrow(
        InvalidTransitionError
      );
      expect(() => transition("cancelled", "cancel")).toThrow(
        InvalidTransitionError
      );
      expect(() => transition("validation_failed", "approve")).toThrow(
        InvalidTransitionError
      );
      expect(() => transition("pending_validation", "approve")).toThrow(
        InvalidTransitionError
      );
    });

    it("InvalidTransitionError includes from and action", () => {
      try {
        transition("approved", "approve");
        expect.fail("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidTransitionError);
        const e = err as InvalidTransitionError;
        expect(e.from).toBe("approved");
        expect(e.action).toBe("approve");
      }
    });
  });

  describe("isTerminal", () => {
    it("returns true for approved", () => {
      expect(isTerminal("approved")).toBe(true);
    });

    it("returns true for rejected", () => {
      expect(isTerminal("rejected")).toBe(true);
    });

    it("returns true for cancelled", () => {
      expect(isTerminal("cancelled")).toBe(true);
    });

    it("returns false for auto_approved (can be cancelled)", () => {
      expect(isTerminal("auto_approved")).toBe(false);
    });

    it("returns true for validation_failed", () => {
      expect(isTerminal("validation_failed")).toBe(true);
    });

    it("returns false for pending_validation", () => {
      expect(isTerminal("pending_validation")).toBe(false);
    });

    it("returns false for pending_approval", () => {
      expect(isTerminal("pending_approval")).toBe(false);
    });
  });

  describe("canTransition", () => {
    it("returns true for valid transitions", () => {
      expect(canTransition("pending_approval", "approve")).toBe(true);
      expect(canTransition("approved", "cancel")).toBe(true);
    });

    it("returns false for invalid transitions", () => {
      expect(canTransition("approved", "approve")).toBe(false);
      expect(canTransition("rejected", "cancel")).toBe(false);
    });
  });
});

// ----------------------------------------------------------------
// Service unit tests (mocked dependencies)
// ----------------------------------------------------------------

describe("ApprovalEngineService", () => {
  const tenantId = "tenant-test";
  const approverId = new mongoose.Types.ObjectId();
  const employeeId = new mongoose.Types.ObjectId();
  const leaveTypeId = new mongoose.Types.ObjectId();
  const leaveRequestId = new mongoose.Types.ObjectId();

  function makeLeaveRequest(
    status: LeaveRequestStatus,
    overrides: Partial<ILeaveRequest> = {}
  ): ILeaveRequest {
    return {
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
      status,
      currentStep: 0,
      reminderCount: 0,
      currentApproverEmployeeId: approverId,
      currentStepStartedAt: new Date(),
      workflowSnapshot: {
        workflowId: new mongoose.Types.ObjectId(),
        workflowVersion: 1,
        name: "Test Workflow",
        steps: [
          {
            order: 0,
            approverType: "role_direct_manager",
            approverUserId: approverId,
            approverGroupIds: null,
            timeoutHours: 48,
            escalationAction: "remind",
            maxReminders: 3,
            allowDelegation: true,
          },
        ],
      },
      autoApprovalRuleName: null,
      approvalHistory: [],
      cancellationReason: null,
      cancelledAt: null,
      cancelledBy: null,
      calendarEventIds: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    } as unknown as ILeaveRequest;
  }

  function makeMultiStepRequest(status: LeaveRequestStatus): ILeaveRequest {
    return makeLeaveRequest(status, {
      workflowSnapshot: {
        workflowId: new mongoose.Types.ObjectId(),
        workflowVersion: 1,
        name: "Two-Step Workflow",
        steps: [
          {
            order: 0,
            approverType: "role_direct_manager",
            approverUserId: approverId,
            approverGroupIds: null,
            timeoutHours: 48,
            escalationAction: "remind",
            maxReminders: 3,
            allowDelegation: true,
          },
          {
            order: 1,
            approverType: "role_hr",
            approverUserId: new mongoose.Types.ObjectId(),
            approverGroupIds: null,
            timeoutHours: 72,
            escalationAction: "escalate_next",
            maxReminders: 2,
            allowDelegation: false,
          },
        ],
      },
    } as unknown as Partial<ILeaveRequest>);
  }

  const mockLeaveRequestRepo = {
    findById: vi.fn(),
    updateStatus: vi.fn(),
  };

  const mockBalanceService = {
    deduct: vi.fn(),
    restore: vi.fn(),
    checkSufficientBalance: vi.fn(),
  };

  const mockAuditService = {
    log: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLeaveRequestRepo.updateStatus.mockResolvedValue(undefined);
    mockBalanceService.deduct.mockResolvedValue(undefined);
    mockBalanceService.restore.mockResolvedValue(undefined);
    mockAuditService.log.mockResolvedValue(undefined);
  });

  function makeServiceDirect(): ApprovalEngineService {
    return new ApprovalEngineService(
      mockLeaveRequestRepo as unknown as ConstructorParameters<
        typeof ApprovalEngineService
      >[0],
      mockBalanceService as unknown as ConstructorParameters<
        typeof ApprovalEngineService
      >[1],
      mockAuditService as unknown as ConstructorParameters<
        typeof ApprovalEngineService
      >[2]
    );
  }

  describe("processApproval — single-step workflow", () => {
    it("transitions to approved when approving the final step", async () => {
      const req = makeLeaveRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processApproval(tenantId, leaveRequestId, {
        approverId,
        approverName: "Alice Manager",
        approverRole: "manager",
        via: "web",
        action: "approved",
      });

      expect(result.newStatus).toBe("approved");
      expect(result.isTerminal).toBe(true);
      expect(mockBalanceService.deduct).toHaveBeenCalledOnce();
      expect(mockLeaveRequestRepo.updateStatus).toHaveBeenCalledOnce();
      expect(mockAuditService.log).toHaveBeenCalledOnce();
    });

    it("advances step when approving a non-final step (multi-step)", async () => {
      const req = makeMultiStepRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processApproval(tenantId, leaveRequestId, {
        approverId,
        approverName: "Alice Manager",
        approverRole: "manager",
        via: "web",
        action: "approved",
      });

      // Still pending_approval because there's another step
      expect(result.newStatus).toBe("pending_approval");
      expect(result.stepAdvanced).toBe(true);
      expect(result.isTerminal).toBe(false);
      expect(mockBalanceService.deduct).not.toHaveBeenCalled();
    });
  });

  describe("processApproval — throws if request not found", () => {
    it("throws when leave request does not exist", async () => {
      mockLeaveRequestRepo.findById.mockResolvedValue(null);

      const service = makeServiceDirect();
      await expect(
        service.processApproval(tenantId, leaveRequestId, {
          approverId,
          approverName: "Alice",
          approverRole: "manager",
          via: "web",
          action: "approved",
        })
      ).rejects.toThrow("Leave request not found");
    });
  });

  describe("processApproval — throws if invalid transition", () => {
    it("throws when status is already terminal", async () => {
      const req = makeLeaveRequest("approved");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      await expect(
        service.processApproval(tenantId, leaveRequestId, {
          approverId,
          approverName: "Alice",
          approverRole: "manager",
          via: "web",
          action: "approved",
        })
      ).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe("processRejection", () => {
    it("transitions to rejected with valid reason", async () => {
      const req = makeLeaveRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processRejection(tenantId, leaveRequestId, {
        approverId,
        approverName: "Alice",
        approverRole: "manager",
        via: "web",
        reason: "Not enough coverage for this period",
      });

      expect(result.newStatus).toBe("rejected");
      expect(result.isTerminal).toBe(true);
      expect(mockBalanceService.deduct).not.toHaveBeenCalled();
    });

    it("throws when reason is fewer than 10 non-whitespace characters", async () => {
      const req = makeLeaveRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      await expect(
        service.processRejection(tenantId, leaveRequestId, {
          approverId,
          approverName: "Alice",
          approverRole: "manager",
          via: "web",
          reason: "Too short",
        })
      ).rejects.toThrow("Rejection reason must contain at least 10 non-whitespace characters");
    });

    it("throws when reason is empty", async () => {
      const req = makeLeaveRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      await expect(
        service.processRejection(tenantId, leaveRequestId, {
          approverId,
          approverName: "Alice",
          approverRole: "manager",
          via: "web",
          reason: "",
        })
      ).rejects.toThrow("Rejection reason must contain at least 10 non-whitespace characters");
    });
  });

  describe("processCancellation", () => {
    it("cancels a pending_approval request", async () => {
      const req = makeLeaveRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processCancellation(tenantId, leaveRequestId, {
        employeeId,
        reason: "Changed my mind",
      });

      expect(result.newStatus).toBe("cancelled");
      expect(mockBalanceService.restore).not.toHaveBeenCalled();
    });

    it("cancels an approved request and restores balance", async () => {
      const req = makeLeaveRequest("approved");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processCancellation(tenantId, leaveRequestId, {
        employeeId,
        reason: null,
      });

      expect(result.newStatus).toBe("cancelled");
      expect(mockBalanceService.restore).toHaveBeenCalledOnce();
    });

    it("cancels an auto_approved request and restores balance", async () => {
      const req = makeLeaveRequest("auto_approved");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processCancellation(tenantId, leaveRequestId, {
        employeeId,
        reason: "No longer needed",
      });

      expect(result.newStatus).toBe("cancelled");
      expect(mockBalanceService.restore).toHaveBeenCalledOnce();
    });

    it("throws if status is rejected (terminal)", async () => {
      const req = makeLeaveRequest("rejected");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      await expect(
        service.processCancellation(tenantId, leaveRequestId, {
          employeeId,
          reason: null,
        })
      ).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe("processEscalation", () => {
    it("records escalation in history and stays pending_approval", async () => {
      const req = makeMultiStepRequest("pending_approval");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      const result = await service.processEscalation(tenantId, leaveRequestId, {
        triggeredBy: "timeout",
      });

      expect(result.newStatus).toBe("pending_approval");
      expect(mockLeaveRequestRepo.updateStatus).toHaveBeenCalledOnce();
    });

    it("throws if status is terminal", async () => {
      const req = makeLeaveRequest("approved");
      mockLeaveRequestRepo.findById.mockResolvedValue(req);

      const service = makeServiceDirect();
      await expect(
        service.processEscalation(tenantId, leaveRequestId, {
          triggeredBy: "timeout",
        })
      ).rejects.toThrow(InvalidTransitionError);
    });
  });

  describe("checkAutoApproval", () => {
    it("returns true when a matching active auto-approval rule exists", async () => {
      const req = {
        ...makeLeaveRequest("pending_approval"),
        leaveTypeId,
        workingDays: 1,
        workflowSnapshot: {
          workflowId: new mongoose.Types.ObjectId(),
          workflowVersion: 1,
          name: "Test",
          steps: [],
        },
      };

      const workflowWithAutoRule = {
        autoApprovalRules: [
          {
            leaveTypeId,
            maxDurationDays: 2,
            isActive: true,
          },
        ],
      };

      const service = makeServiceDirect();
      const result = service.checkAutoApproval(
        req as unknown as ILeaveRequest,
        workflowWithAutoRule as unknown as { autoApprovalRules: Array<{ leaveTypeId: mongoose.Types.ObjectId; maxDurationDays: number; isActive: boolean }> }
      );

      expect(result).toBe(true);
    });

    it("returns false when no matching auto-approval rule exists", async () => {
      const differentLeaveTypeId = new mongoose.Types.ObjectId();
      const req = {
        ...makeLeaveRequest("pending_approval"),
        leaveTypeId: differentLeaveTypeId,
        workingDays: 1,
      };

      const workflowWithAutoRule = {
        autoApprovalRules: [
          {
            leaveTypeId,
            maxDurationDays: 2,
            isActive: true,
          },
        ],
      };

      const service = makeServiceDirect();
      const result = service.checkAutoApproval(
        req as unknown as ILeaveRequest,
        workflowWithAutoRule as unknown as { autoApprovalRules: Array<{ leaveTypeId: mongoose.Types.ObjectId; maxDurationDays: number; isActive: boolean }> }
      );

      expect(result).toBe(false);
    });

    it("returns false when working days exceed maxDurationDays", async () => {
      const req = {
        ...makeLeaveRequest("pending_approval"),
        leaveTypeId,
        workingDays: 5,
      };

      const workflowWithAutoRule = {
        autoApprovalRules: [
          {
            leaveTypeId,
            maxDurationDays: 2,
            isActive: true,
          },
        ],
      };

      const service = makeServiceDirect();
      const result = service.checkAutoApproval(
        req as unknown as ILeaveRequest,
        workflowWithAutoRule as unknown as { autoApprovalRules: Array<{ leaveTypeId: mongoose.Types.ObjectId; maxDurationDays: number; isActive: boolean }> }
      );

      expect(result).toBe(false);
    });

    it("returns false when rule is inactive", async () => {
      const req = {
        ...makeLeaveRequest("pending_approval"),
        leaveTypeId,
        workingDays: 1,
      };

      const workflowWithAutoRule = {
        autoApprovalRules: [
          {
            leaveTypeId,
            maxDurationDays: 2,
            isActive: false,
          },
        ],
      };

      const service = makeServiceDirect();
      const result = service.checkAutoApproval(
        req as unknown as ILeaveRequest,
        workflowWithAutoRule as unknown as { autoApprovalRules: Array<{ leaveTypeId: mongoose.Types.ObjectId; maxDurationDays: number; isActive: boolean }> }
      );

      expect(result).toBe(false);
    });
  });
});
