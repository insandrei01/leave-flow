/**
 * Teams interaction handler tests.
 */

import { describe, it, expect, vi } from "vitest";
import {
  handleLeaveFormSubmit,
  handleApproveAction,
  handleRejectAction,
  type TeamsActionPayload,
  type TeamsInteractionsDeps,
} from "./bot-teams.interactions.js";
import type { TeamsBotAdapter } from "./bot-teams.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";
import type { ApprovalEngineService } from "../approval-engine/approval-engine.service.js";

// ----------------------------------------------------------------
// Mock builders
// ----------------------------------------------------------------

function makeAdapter(): Partial<TeamsBotAdapter> {
  return {
    sendDirectMessage: vi
      .fn()
      .mockResolvedValue({ platform: "teams", channelId: "conv-001", messageId: "act-001" }),
    updateApprovalCard: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMappingService(
  resolved: { tenantId: string; employeeId: string; conversationReference: null } | null = null
): Partial<BotMappingService> {
  return {
    resolveUser: vi.fn().mockResolvedValue(resolved),
  };
}

function makeLeaveRequestService(): Partial<LeaveRequestService> {
  return {
    create: vi.fn().mockResolvedValue({ _id: "lr-001" }),
  };
}

function makeApprovalEngine(): Partial<ApprovalEngineService> {
  return {
    processApproval: vi.fn().mockResolvedValue(undefined),
    processRejection: vi.fn().mockResolvedValue(undefined),
  };
}

function makeDeps(overrides: Partial<TeamsInteractionsDeps> = {}): TeamsInteractionsDeps {
  return {
    adapter: (overrides.adapter ?? makeAdapter()) as TeamsBotAdapter,
    mappingService: (overrides.mappingService ?? makeMappingService()) as BotMappingService,
    leaveRequestService:
      (overrides.leaveRequestService ?? makeLeaveRequestService()) as LeaveRequestService,
    approvalEngine: (overrides.approvalEngine ?? makeApprovalEngine()) as ApprovalEngineService,
    workflowId: "6507c7db1c71e600a7c7db01",
  };
}

// ----------------------------------------------------------------
// handleLeaveFormSubmit
// ----------------------------------------------------------------

describe("handleLeaveFormSubmit", () => {
  const VALID_PAYLOAD: TeamsActionPayload = {
    verb: "submit_leave_form",
    platformUserId: "teams-user-001",
    data: {
      leaveTypeId: "6507c7db1c71e600a7c7db01",
      startDate: "2026-04-01",
      endDate: "2026-04-03",
      reason: "Family event",
    },
    conversationRef: {
      serviceUrl: "https://smba.trafficmanager.net/amer/",
      channelId: "msteams",
      conversation: { id: "conv-001" },
      bot: { id: "bot-001", name: "LeaveFlow" },
    },
  };

  it("creates a leave request when user is connected", async () => {
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const leaveRequestService = makeLeaveRequestService();
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
      leaveRequestService: leaveRequestService as LeaveRequestService,
    });

    await handleLeaveFormSubmit(VALID_PAYLOAD, deps);

    expect(leaveRequestService.create).toHaveBeenCalledOnce();
  });

  it("throws when user is not connected", async () => {
    const mappingService = makeMappingService(null);
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
    });

    await expect(handleLeaveFormSubmit(VALID_PAYLOAD, deps)).rejects.toThrow(
      "not connected"
    );
  });

  it("throws when leaveTypeId is missing", async () => {
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
    });

    const payloadWithoutLeaveType: TeamsActionPayload = {
      ...VALID_PAYLOAD,
      data: { ...VALID_PAYLOAD.data, leaveTypeId: undefined },
    };

    await expect(handleLeaveFormSubmit(payloadWithoutLeaveType, deps)).rejects.toThrow(
      "Missing required"
    );
  });
});

// ----------------------------------------------------------------
// handleApproveAction
// ----------------------------------------------------------------

describe("handleApproveAction", () => {
  const APPROVE_PAYLOAD: TeamsActionPayload = {
    verb: "approve",
    platformUserId: "teams-approver-001",
    data: {
      requestId: "6507c7db1c71e600a7c7db01",
    },
    conversationRef: {
      serviceUrl: "https://smba.trafficmanager.net/amer/",
      channelId: "msteams",
      conversation: { id: "conv-001" },
      bot: { id: "bot-001", name: "LeaveFlow" },
    },
    messageId: "activity-001",
  };

  it("calls processApproval on the approval engine", async () => {
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const approvalEngine = makeApprovalEngine();
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
      approvalEngine: approvalEngine as ApprovalEngineService,
    });

    await handleApproveAction(APPROVE_PAYLOAD, deps);

    expect(approvalEngine.processApproval).toHaveBeenCalledOnce();
  });

  it("updates the approval card after approving", async () => {
    const adapter = makeAdapter();
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      adapter: adapter as TeamsBotAdapter,
      mappingService: mappingService as BotMappingService,
    });

    await handleApproveAction(APPROVE_PAYLOAD, deps);

    expect(adapter.updateApprovalCard).toHaveBeenCalledOnce();
    const [, update] = (adapter.updateApprovalCard as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      { status: string },
    ];
    expect(update.status).toBe("approved");
  });

  it("throws when user is not connected", async () => {
    const mappingService = makeMappingService(null);
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
    });

    await expect(handleApproveAction(APPROVE_PAYLOAD, deps)).rejects.toThrow("not connected");
  });

  it("throws when requestId is missing", async () => {
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
    });

    const badPayload: TeamsActionPayload = {
      ...APPROVE_PAYLOAD,
      data: {},
    };

    await expect(handleApproveAction(badPayload, deps)).rejects.toThrow("requestId");
  });
});

// ----------------------------------------------------------------
// handleRejectAction
// ----------------------------------------------------------------

describe("handleRejectAction", () => {
  const REJECT_PAYLOAD: TeamsActionPayload = {
    verb: "reject",
    platformUserId: "teams-approver-001",
    data: {
      requestId: "6507c7db1c71e600a7c7db01",
      reason: "Not the right time",
    },
    conversationRef: {
      serviceUrl: "https://smba.trafficmanager.net/amer/",
      channelId: "msteams",
      conversation: { id: "conv-001" },
      bot: { id: "bot-001", name: "LeaveFlow" },
    },
    messageId: "activity-001",
  };

  it("calls processRejection on the approval engine", async () => {
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const approvalEngine = makeApprovalEngine();
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
      approvalEngine: approvalEngine as ApprovalEngineService,
    });

    await handleRejectAction(REJECT_PAYLOAD, deps);

    expect(approvalEngine.processRejection).toHaveBeenCalledOnce();
  });

  it("updates the approval card with rejected status", async () => {
    const adapter = makeAdapter();
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      adapter: adapter as TeamsBotAdapter,
      mappingService: mappingService as BotMappingService,
    });

    await handleRejectAction(REJECT_PAYLOAD, deps);

    expect(adapter.updateApprovalCard).toHaveBeenCalledOnce();
    const [, update] = (adapter.updateApprovalCard as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      { status: string },
    ];
    expect(update.status).toBe("rejected");
  });

  it("throws when reason is missing", async () => {
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      mappingService: mappingService as BotMappingService,
    });

    const noReasonPayload: TeamsActionPayload = {
      ...REJECT_PAYLOAD,
      data: { requestId: "6507c7db1c71e600a7c7db01" },
    };

    await expect(handleRejectAction(noReasonPayload, deps)).rejects.toThrow("reason");
  });
});
