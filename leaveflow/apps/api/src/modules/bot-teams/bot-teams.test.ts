/**
 * TeamsBotAdapter tests — unit tests with mocked Bot Framework client.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  TeamsBotAdapter,
  type TeamsBotClient,
  type TeamsConversationReference,
} from "./bot-teams.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type {
  LeaveRequestSummary,
  MessageReference,
  CardUpdate,
  ChannelReference,
} from "../bot-adapter/bot-adapter.types.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const CONVERSATION_REF: TeamsConversationReference = {
  serviceUrl: "https://smba.trafficmanager.net/amer/",
  channelId: "msteams",
  conversation: { id: "conv-001" },
  bot: { id: "bot-001", name: "LeaveFlow" },
  user: { id: "user-teams-001" },
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
  othersOut: [],
  teamCoverage: 92,
  approvalChain: ["Submitted", "You (Manager)", "HR Review", "Done"],
  currentStepIndex: 1,
  submittedAt: "today",
};

// ----------------------------------------------------------------
// Mock builders
// ----------------------------------------------------------------

function makeClient(overrides: Partial<TeamsBotClient> = {}): TeamsBotClient {
  return {
    sendActivity: vi.fn().mockResolvedValue({ activityId: "activity-001" }),
    updateActivity: vi.fn().mockResolvedValue(undefined),
    createConversation: vi.fn().mockResolvedValue(CONVERSATION_REF),
    ...overrides,
  };
}

function makeMappingService(
  resolved: Awaited<ReturnType<BotMappingService["resolveUser"]>> = null
): Partial<BotMappingService> {
  return {
    resolveUser: vi.fn().mockResolvedValue(resolved),
  };
}

function makeAdapter(
  client?: TeamsBotClient,
  mappingService?: Partial<BotMappingService>
): TeamsBotAdapter {
  return new TeamsBotAdapter(
    client ?? makeClient(),
    (mappingService ?? makeMappingService()) as BotMappingService,
    "https://smba.trafficmanager.net/amer/"
  );
}

// ----------------------------------------------------------------
// sendLeaveRequestForm
// ----------------------------------------------------------------

describe("TeamsBotAdapter.sendLeaveRequestForm", () => {
  it("sends an Adaptive Card with Input fields", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendLeaveRequestForm({
      platformUserId: "user-teams-001",
      leaveTypes: [{ id: "lt-001", name: "PTO" }],
    });

    expect(client.sendActivity).toHaveBeenCalledOnce();
    const [, activity] = (client.sendActivity as ReturnType<typeof vi.fn>).mock.calls[0] as [
      TeamsConversationReference,
      { attachments: Array<{ contentType: string; content: Record<string, unknown> }> },
    ];

    expect(activity.attachments).toHaveLength(1);
    expect(activity.attachments[0].contentType).toBe(
      "application/vnd.microsoft.card.adaptive"
    );
  });

  it("includes leave type choices in the card", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendLeaveRequestForm({
      platformUserId: "user-teams-001",
      leaveTypes: [
        { id: "lt-001", name: "PTO" },
        { id: "lt-002", name: "Sick Leave" },
      ],
    });

    const [, activity] = (client.sendActivity as ReturnType<typeof vi.fn>).mock.calls[0] as [
      TeamsConversationReference,
      { attachments: Array<{ content: Record<string, unknown> }> },
    ];

    const cardBody = activity.attachments[0].content["body"] as Array<Record<string, unknown>>;
    const choiceSet = cardBody.find((el) => el["type"] === "Input.ChoiceSet");
    expect(choiceSet).toBeDefined();
    const choices = choiceSet!["choices"] as Array<{ title: string; value: string }>;
    expect(choices).toHaveLength(2);
  });
});

// ----------------------------------------------------------------
// sendApprovalCard
// ----------------------------------------------------------------

describe("TeamsBotAdapter.sendApprovalCard", () => {
  it("sends an Adaptive Card to the approver", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendApprovalCard(LEAVE_SUMMARY, "user-teams-approver");

    expect(client.sendActivity).toHaveBeenCalledOnce();
  });

  it("returns a MessageReference with platform: teams", async () => {
    const adapter = makeAdapter();

    const ref = await adapter.sendApprovalCard(LEAVE_SUMMARY, "user-teams-approver");

    expect(ref.platform).toBe("teams");
    expect(ref.messageId).toBe("activity-001");
  });

  it("card has Action.Execute with approve and reject verbs", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendApprovalCard(LEAVE_SUMMARY, "user-teams-approver");

    const [, activity] = (client.sendActivity as ReturnType<typeof vi.fn>).mock.calls[0] as [
      TeamsConversationReference,
      { attachments: Array<{ content: Record<string, unknown> }> },
    ];

    const card = activity.attachments[0].content;
    const actions = card["actions"] as Array<Record<string, unknown>>;
    expect(actions.find((a) => a["verb"] === "approve")).toBeDefined();
    expect(actions.find((a) => a["verb"] === "reject")).toBeDefined();
  });
});

// ----------------------------------------------------------------
// updateApprovalCard
// ----------------------------------------------------------------

describe("TeamsBotAdapter.updateApprovalCard", () => {
  const REF: MessageReference = {
    platform: "teams",
    channelId: "conv-001",
    messageId: "activity-001",
    conversationRef: CONVERSATION_REF as unknown as Record<string, unknown>,
  };

  it("calls updateActivity with the correct activityId", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.updateApprovalCard(REF, {
      status: "approved",
      actorName: "Tom Wilson",
      actedAt: "2026-03-16T10:00:00Z",
    });

    expect(client.updateActivity).toHaveBeenCalledOnce();
    const [, activityId] = (client.updateActivity as ReturnType<typeof vi.fn>).mock.calls[0] as [
      TeamsConversationReference,
      string,
    ];
    expect(activityId).toBe("activity-001");
  });

  it("uses Good color for approved status", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.updateApprovalCard(REF, {
      status: "approved",
      actorName: "Tom Wilson",
      actedAt: "2026-03-16T10:00:00Z",
    });

    const [, , activity] = (client.updateActivity as ReturnType<typeof vi.fn>).mock.calls[0] as [
      TeamsConversationReference,
      string,
      { attachments: Array<{ content: Record<string, unknown> }> },
    ];
    const text = JSON.stringify(activity.attachments[0].content);
    expect(text).toContain("Good");
  });

  it("throws when conversationRef is missing", async () => {
    const adapter = makeAdapter();

    await expect(
      adapter.updateApprovalCard(
        { platform: "teams", channelId: "c", messageId: "m" },
        { status: "approved", actorName: "Tom", actedAt: "now" }
      )
    ).rejects.toThrow("conversationRef");
  });
});

// ----------------------------------------------------------------
// sendDirectMessage
// ----------------------------------------------------------------

describe("TeamsBotAdapter.sendDirectMessage", () => {
  it("sends a message activity", async () => {
    const client = makeClient();
    const adapter = makeAdapter(client);

    await adapter.sendDirectMessage("user-teams-001", { text: "Hello!" });

    expect(client.sendActivity).toHaveBeenCalledOnce();
  });

  it("returns MessageReference with platform: teams", async () => {
    const adapter = makeAdapter();
    const ref = await adapter.sendDirectMessage("user-teams-001", { text: "Hello!" });

    expect(ref.platform).toBe("teams");
  });
});

// ----------------------------------------------------------------
// resolveUser
// ----------------------------------------------------------------

describe("TeamsBotAdapter.resolveUser", () => {
  it("returns null when no mapping exists", async () => {
    const adapter = makeAdapter();
    const result = await adapter.resolveUser("user-unknown");

    expect(result).toBeNull();
  });

  it("delegates to BotMappingService with platform: teams", async () => {
    const mappingService = makeMappingService(null);
    const adapter = makeAdapter(undefined, mappingService);

    await adapter.resolveUser("user-teams-001");

    expect(mappingService.resolveUser).toHaveBeenCalledWith("teams", "user-teams-001");
  });

  it("returns ResolvedUser when mapping exists", async () => {
    const mappingService = makeMappingService({
      tenantId: "tenant-001",
      employeeId: "emp-001",
      conversationReference: null,
    });
    const adapter = makeAdapter(undefined, mappingService);

    const result = await adapter.resolveUser("user-teams-001");

    expect(result).not.toBeNull();
    expect(result!.platform).toBe("teams");
    expect(result!.tenantId).toBe("tenant-001");
    expect(result!.employeeId).toBe("emp-001");
  });
});
