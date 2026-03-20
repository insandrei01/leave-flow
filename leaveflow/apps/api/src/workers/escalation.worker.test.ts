/**
 * Escalation worker tests.
 *
 * Tests the escalation logic in isolation using mocked dependencies.
 * No real BullMQ or MongoDB connections.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  processEscalationJob,
  type EscalationWorkerDeps,
} from "./escalation.worker.js";
import type { EscalationJobData } from "../lib/bullmq.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeObjectId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function makeLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    employeeId: makeObjectId(),
    leaveTypeId: makeObjectId(),
    status: "pending_approval" as const,
    currentStep: 0,
    currentStepStartedAt: new Date(Date.now() - 25 * 3_600_000), // 25h ago
    currentApproverEmployeeId: makeObjectId(),
    reminderCount: 0,
    workflowSnapshot: {
      steps: [
        {
          order: 0,
          timeoutHours: 24,
          escalationAction: "remind",
          maxReminders: 2,
          approverType: "specific_user",
          approverUserId: makeObjectId(),
          approverGroupIds: null,
          allowDelegation: false,
        },
      ],
    },
    approvalHistory: [],
    ...overrides,
  };
}

function makeDeps(overrides: Partial<EscalationWorkerDeps> = {}): EscalationWorkerDeps {
  return {
    leaveRequestRepo: {
      findById: vi.fn(),
      updateStatus: vi.fn().mockResolvedValue(undefined),
    },
    approvalEngine: {
      processEscalation: vi.fn().mockResolvedValue({
        leaveRequestId: makeObjectId(),
        previousStatus: "pending_approval",
        newStatus: "pending_approval",
        stepAdvanced: true,
        isTerminal: false,
      }),
    },
    notificationService: {
      notify: vi.fn().mockResolvedValue({ _id: makeObjectId() }),
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

describe("processEscalationJob", () => {
  const TENANT_ID = "tenant-a";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when leave request is not found", async () => {
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(null),
        updateStatus: vi.fn(),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: makeObjectId().toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.approvalEngine.processEscalation).not.toHaveBeenCalled();
    expect(deps.notificationService.notify).not.toHaveBeenCalled();
  });

  it("does nothing when request is no longer pending_approval", async () => {
    const req = makeLeaveRequest({ status: "approved" });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn(),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.approvalEngine.processEscalation).not.toHaveBeenCalled();
  });

  it("does nothing when step index does not match currentStep", async () => {
    const req = makeLeaveRequest({ currentStep: 1 });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn(),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.approvalEngine.processEscalation).not.toHaveBeenCalled();
    expect(deps.notificationService.notify).not.toHaveBeenCalled();
  });

  it("does nothing when timeout has not been exceeded", async () => {
    // currentStepStartedAt is 1h ago, timeout is 24h
    const req = makeLeaveRequest({
      currentStepStartedAt: new Date(Date.now() - 1 * 3_600_000),
    });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn(),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.approvalEngine.processEscalation).not.toHaveBeenCalled();
    expect(deps.notificationService.notify).not.toHaveBeenCalled();
  });

  it("sends reminder notification when mode is 'remind' and under max reminders", async () => {
    const req = makeLeaveRequest({ reminderCount: 0 });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.notificationService.notify).toHaveBeenCalledOnce();
    const notifyCall = (deps.notificationService.notify as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(notifyCall.eventType).toBe("approval_reminder");
    expect(deps.approvalEngine.processEscalation).not.toHaveBeenCalled();
  });

  it("increments reminderCount after sending reminder", async () => {
    const req = makeLeaveRequest({ reminderCount: 0 });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.leaveRequestRepo.updateStatus).toHaveBeenCalledWith(
      TENANT_ID,
      expect.any(mongoose.Types.ObjectId),
      expect.objectContaining({ reminderCount: 1 })
    );
  });

  it("escalates to next step when mode is 'escalate_next'", async () => {
    const req = makeLeaveRequest({
      workflowSnapshot: {
        steps: [
          {
            order: 0,
            timeoutHours: 24,
            escalationAction: "escalate_next",
            maxReminders: 1,
            approverType: "specific_user",
            approverUserId: makeObjectId(),
            approverGroupIds: null,
            allowDelegation: false,
          },
        ],
      },
    });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.approvalEngine.processEscalation).toHaveBeenCalledOnce();
  });

  it("notifies HR when mode is 'none'", async () => {
    const req = makeLeaveRequest({
      workflowSnapshot: {
        steps: [
          {
            order: 0,
            timeoutHours: 24,
            escalationAction: "none",
            maxReminders: 1,
            approverType: "specific_user",
            approverUserId: makeObjectId(),
            approverGroupIds: null,
            allowDelegation: false,
          },
        ],
      },
    });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.notificationService.notify).toHaveBeenCalledOnce();
    const notifyCall = (deps.notificationService.notify as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(notifyCall.eventType).toBe("request_escalated");
  });

  it("writes an audit log entry for each action", async () => {
    const req = makeLeaveRequest();
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    expect(deps.auditService.log).toHaveBeenCalled();
  });

  it("transitions to escalate_next after max reminders exceeded", async () => {
    const req = makeLeaveRequest({
      reminderCount: 2, // maxReminders is 2
    });
    const deps = makeDeps({
      leaveRequestRepo: {
        findById: vi.fn().mockResolvedValue(req),
        updateStatus: vi.fn().mockResolvedValue(undefined),
      },
    });

    const jobData: EscalationJobData = {
      tenantId: TENANT_ID,
      leaveRequestId: req._id.toString(),
      stepIndex: 0,
    };

    await processEscalationJob(jobData, deps);

    // When reminders are exhausted and action is 'remind', escalate instead
    expect(deps.approvalEngine.processEscalation).toHaveBeenCalledOnce();
  });
});
