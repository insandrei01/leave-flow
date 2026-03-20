/**
 * SlackBotAdapter tests — unit tests with mocked Slack WebClient.
 *
 * Tests verify that the adapter correctly calls the Slack API and
 * delegates identity resolution to the BotMappingService.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SlackBotAdapter, type SlackWebClient } from "./bot-slack.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type {
  LeaveFormContext,
  LeaveRequestSummary,
  MessageReference,
  CardUpdate,
  ChannelReference,
} from "../bot-adapter/bot-adapter.types.js";

// ----------------------------------------------------------------
// Mock builders
// ----------------------------------------------------------------

function makeClient(overrides: Partial<SlackWebClient> = {}): SlackWebClient {
  return {
    views: {
      open: vi.fn().mockResolvedValue({ ok: true }),
      ...((overrides.views as Record<string, unknown>) ?? {}),
    },
    chat: {
      postMessage: vi
        .fn()
        .mockResolvedValue({ ok: true, ts: "12345.67890", channel: "C_DM_001" }),
      update: vi.fn().mockResolvedValue({ ok: true }),
      ...((overrides.chat as Record<string, unknown>) ?? {}),
    },
    conversations: {
      open: vi
        .fn()
        .mockResolvedValue({ ok: true, channel: { id: "C_DM_001" } }),
      ...((overrides.conversations as Record<string, unknown>) ?? {}),
    },
  } as SlackWebClient;
}

function makeMappingService(
  resolvedUser: Awaited<ReturnType<BotMappingService["resolveUser"]>> = null
): Pick<BotMappingService, "resolveUser"> {
  return {
    resolveUser: vi.fn().mockResolvedValue(resolvedUser),
  } as unknown as Pick<BotMappingService, "resolveUser">;
}

function makeAdapter(
  client?: SlackWebClient,
  mappingService?: Pick<BotMappingService, "resolveUser">
): SlackBotAdapter {
  return new SlackBotAdapter(
    client ?? makeClient(),
    (mappingService ?? makeMappingService()) as BotMappingService
  );
}

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const LEAVE_FORM_CONTEXT: LeaveFormContext = {
  platformUserId: "U12345678",
  triggerId: "trigger_abc123",
  leaveTypes: [
    { id: "lt-001", name: "PTO" },
    { id: "lt-002", name: "Sick Leave" },
  ],
};

const LEAVE_SUMMARY: LeaveRequestSummary = {
  requestId: "LR-2026-0342",
  employeeName: "Maria Santos",
  leaveTypeName: "PTO",
  startDate: "Mar 25",
  endDate: "Mar 27",
  workingDays: 3,
  reason: "Family visiting",
  teamName: "Engineering",
  balanceAfter: 12,
  balanceTotal: 20,
  othersOut: ["Alex K."],
  teamCoverage: 92,
  approvalChain: ["Submitted", "You (Manager)", "HR Review", "Done"],
  currentStepIndex: 1,
  submittedAt: "today at 10:24am",
  autoEscalateInHours: 24,
};

// ----------------------------------------------------------------
// sendLeaveRequestForm
// ----------------------------------------------------------------

describe("SlackBotAdapter.sendLeaveRequestForm", () => {
  it("calls views.open with the triggerId", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendLeaveRequestForm(LEAVE_FORM_CONTEXT);

    expect(client.views.open).toHaveBeenCalledOnce();
    const [args] = (client.views.open as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { trigger_id: string; view: Record<string, unknown> },
    ];
    expect(args.trigger_id).toBe("trigger_abc123");
  });

  it("view has type: modal", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendLeaveRequestForm(LEAVE_FORM_CONTEXT);

    const [args] = (client.views.open as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { trigger_id: string; view: Record<string, unknown> },
    ];
    expect(args.view["type"]).toBe("modal");
  });

  it("view includes leave type select block", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendLeaveRequestForm(LEAVE_FORM_CONTEXT);

    const [args] = (client.views.open as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { trigger_id: string; view: Record<string, unknown> },
    ];
    const blocks = args.view["blocks"] as Array<Record<string, unknown>>;
    const leaveTypeBlock = blocks.find((b) => b["block_id"] === "leave_type_block");
    expect(leaveTypeBlock).toBeDefined();
  });

  it("throws when triggerId is missing", async () => {
    const adapter = makeAdapter();
    await expect(
      adapter.sendLeaveRequestForm({ ...LEAVE_FORM_CONTEXT, triggerId: undefined })
    ).rejects.toThrow("triggerId is required");
  });
});

// ----------------------------------------------------------------
// sendApprovalCard
// ----------------------------------------------------------------

describe("SlackBotAdapter.sendApprovalCard", () => {
  it("opens a DM channel before posting", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendApprovalCard(LEAVE_SUMMARY, "U_APPROVER_001");

    expect(client.conversations.open).toHaveBeenCalledWith({
      users: "U_APPROVER_001",
    });
  });

  it("calls chat.postMessage with blocks", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendApprovalCard(LEAVE_SUMMARY, "U_APPROVER_001");

    expect(client.chat.postMessage).toHaveBeenCalledOnce();
    const [args] = (client.chat.postMessage as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Record<string, unknown>];
    expect(args["blocks"]).toBeDefined();
    expect(Array.isArray(args["blocks"])).toBe(true);
  });

  it("returns a MessageReference with platform: slack", async () => {
    const adapter = makeAdapter();
    const ref = await adapter.sendApprovalCard(LEAVE_SUMMARY, "U_APPROVER_001");

    expect(ref.platform).toBe("slack");
    expect(ref.channelId).toBeDefined();
    expect(ref.messageId).toBeDefined();
  });

  it("throws when DM channel open returns no ID", async () => {
    const client = makeClient({
      conversations: {
        open: vi.fn().mockResolvedValue({ ok: true, channel: { id: "" } }),
      } as SlackWebClient["conversations"],
    });
    const adapter = makeAdapter(client);

    await expect(
      adapter.sendApprovalCard(LEAVE_SUMMARY, "U_APPROVER_001")
    ).rejects.toThrow("Failed to open DM channel");
  });
});

// ----------------------------------------------------------------
// updateApprovalCard
// ----------------------------------------------------------------

describe("SlackBotAdapter.updateApprovalCard", () => {
  const REF: MessageReference = {
    platform: "slack",
    channelId: "C_DM_001",
    messageId: "12345.67890",
  };

  it("calls chat.update with the correct channel and ts", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    const update: CardUpdate = {
      status: "approved",
      actorName: "Tom Wilson",
      actedAt: "Mar 16 at 2:30pm",
    };

    await adapter.updateApprovalCard(REF, update);

    expect(client.chat.update).toHaveBeenCalledOnce();
    const [args] = (client.chat.update as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(args["channel"]).toBe("C_DM_001");
    expect(args["ts"]).toBe("12345.67890");
  });

  it("includes rejection reason in rejected status text", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    const update: CardUpdate = {
      status: "rejected",
      actorName: "Tom Wilson",
      actedAt: "Mar 16",
      rejectionReason: "Critical deadline that week.",
    };

    await adapter.updateApprovalCard(REF, update);

    const [args] = (client.chat.update as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Record<string, unknown>,
    ];
    const text = JSON.stringify(args["blocks"]);
    expect(text).toContain("Critical deadline");
  });
});

// ----------------------------------------------------------------
// sendDirectMessage
// ----------------------------------------------------------------

describe("SlackBotAdapter.sendDirectMessage", () => {
  it("opens DM and calls postMessage", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendDirectMessage("U12345", { text: "Hello!" });

    expect(client.conversations.open).toHaveBeenCalledWith({ users: "U12345" });
    expect(client.chat.postMessage).toHaveBeenCalledOnce();
  });

  it("returns MessageReference with correct platform", async () => {
    const adapter = makeAdapter();
    const ref = await adapter.sendDirectMessage("U12345", { text: "Hello!" });

    expect(ref.platform).toBe("slack");
  });
});

// ----------------------------------------------------------------
// postToChannel
// ----------------------------------------------------------------

describe("SlackBotAdapter.postToChannel", () => {
  const CHANNEL_REF: ChannelReference = { platform: "slack", channelId: "C_TEAM_001" };

  it("calls chat.postMessage with the channel ID", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.postToChannel(CHANNEL_REF, { text: "Maria will be out." });

    expect(client.chat.postMessage).toHaveBeenCalledOnce();
    const [args] = (client.chat.postMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(args["channel"]).toBe("C_TEAM_001");
  });

  it("returns a MessageReference", async () => {
    const adapter = makeAdapter();
    const ref = await adapter.postToChannel(CHANNEL_REF, { text: "Test" });

    expect(ref.platform).toBe("slack");
    expect(ref.channelId).toBeDefined();
  });
});

// ----------------------------------------------------------------
// resolveUser
// ----------------------------------------------------------------

describe("SlackBotAdapter.resolveUser", () => {
  it("returns null when no mapping exists", async () => {
    const mappingService = makeMappingService(null);
    const adapter = makeAdapter(undefined, mappingService);

    const result = await adapter.resolveUser("U_UNKNOWN");

    expect(result).toBeNull();
  });

  it("delegates to BotMappingService with platform: slack", async () => {
    const mappingService = makeMappingService(null);
    const adapter = makeAdapter(undefined, mappingService);

    await adapter.resolveUser("U12345");

    expect(mappingService.resolveUser).toHaveBeenCalledWith("slack", "U12345");
  });

  it("returns ResolvedUser when mapping exists", async () => {
    const mappingService = makeMappingService({
      tenantId: "tenant-001",
      employeeId: "emp-001",
      conversationReference: null,
    });
    const adapter = makeAdapter(undefined, mappingService);

    const result = await adapter.resolveUser("U12345");

    expect(result).not.toBeNull();
    expect(result!.tenantId).toBe("tenant-001");
    expect(result!.employeeId).toBe("emp-001");
    expect(result!.platform).toBe("slack");
    expect(result!.platformUserId).toBe("U12345");
  });
});
