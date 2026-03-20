/**
 * Slack command handler tests.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { handleLeaveCommand, type SlackCommandPayload, type SlackCommandsDeps } from "./bot-slack.commands.js";
import type { SlackBotAdapter } from "./bot-slack.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { BalanceService } from "../balance/balance.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";

// ----------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------

function makeAdapter(): Partial<SlackBotAdapter> {
  return {
    sendLeaveRequestForm: vi.fn().mockResolvedValue(undefined),
    sendDirectMessage: vi.fn().mockResolvedValue({ platform: "slack", channelId: "C", messageId: "ts" }),
    postToChannel: vi.fn().mockResolvedValue({ platform: "slack", channelId: "C", messageId: "ts" }),
  };
}

function makeMappingService(resolved: { tenantId: string; employeeId: string; conversationReference: null } | null = null): Partial<BotMappingService> {
  return {
    resolveUser: vi.fn().mockResolvedValue(resolved),
  };
}

function makeBalanceService(balances: unknown[] = []): Partial<BalanceService> {
  return {
    getEmployeeBalances: vi.fn().mockResolvedValue(balances),
  };
}

function makeLeaveRequestService(request: unknown = null): Partial<LeaveRequestService> {
  return {
    findById: vi.fn().mockResolvedValue(request),
  };
}

function makeDeps(overrides: Partial<SlackCommandsDeps> = {}): SlackCommandsDeps {
  return {
    adapter: (overrides.adapter ?? makeAdapter()) as SlackBotAdapter,
    mappingService: (overrides.mappingService ?? makeMappingService()) as BotMappingService,
    balanceService: (overrides.balanceService ?? makeBalanceService()) as BalanceService,
    leaveRequestService: (overrides.leaveRequestService ?? makeLeaveRequestService()) as LeaveRequestService,
    leaveTypes: [{ id: "lt-001", name: "PTO" }],
  };
}

const BASE_PAYLOAD: SlackCommandPayload = {
  command: "/leave",
  text: "",
  user_id: "U12345678",
  channel_id: "C_CHANNEL_001",
  trigger_id: "trigger_abc",
  team_id: "T_TEAM_001",
};

// ----------------------------------------------------------------
// /leave (default)
// ----------------------------------------------------------------

describe("handleLeaveCommand — /leave (default)", () => {
  it("opens leave form modal", async () => {
    const adapter = makeAdapter();
    const deps = makeDeps({ adapter: adapter as SlackBotAdapter });

    await handleLeaveCommand(BASE_PAYLOAD, deps);

    expect(adapter.sendLeaveRequestForm).toHaveBeenCalledOnce();
    expect(adapter.sendLeaveRequestForm).toHaveBeenCalledWith(
      expect.objectContaining({
        platformUserId: "U12345678",
        triggerId: "trigger_abc",
      })
    );
  });

  it("passes configured leaveTypes to the form", async () => {
    const adapter = makeAdapter();
    const deps = makeDeps({ adapter: adapter as SlackBotAdapter });

    await handleLeaveCommand(BASE_PAYLOAD, deps);

    const [ctx] = (adapter.sendLeaveRequestForm as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { leaveTypes: unknown[] },
    ];
    expect(ctx.leaveTypes).toHaveLength(1);
    expect(ctx.leaveTypes[0]).toMatchObject({ id: "lt-001", name: "PTO" });
  });
});

// ----------------------------------------------------------------
// /leave balance
// ----------------------------------------------------------------

describe("handleLeaveCommand — /leave balance", () => {
  it("sends DM when user is not connected", async () => {
    const adapter = makeAdapter();
    const mappingService = makeMappingService(null);
    const deps = makeDeps({
      adapter: adapter as SlackBotAdapter,
      mappingService: mappingService as BotMappingService,
    });

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "balance" }, deps);

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
    const [, msg] = (adapter.sendDirectMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { text: string },
    ];
    expect(msg.text).toContain("not connected");
  });

  it("calls getEmployeeBalances when user is connected", async () => {
    const balanceService = makeBalanceService([
      { leaveTypeName: "PTO", used: 5, allocated: 20 },
    ]);
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      balanceService: balanceService as BalanceService,
      mappingService: mappingService as BotMappingService,
    });

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "balance" }, deps);

    expect(balanceService.getEmployeeBalances).toHaveBeenCalledOnce();
  });
});

// ----------------------------------------------------------------
// /leave status
// ----------------------------------------------------------------

describe("handleLeaveCommand — /leave status", () => {
  it("sends DM with usage hint when no requestId given", async () => {
    const adapter = makeAdapter();
    const deps = makeDeps({ adapter: adapter as SlackBotAdapter });

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "status" }, deps);

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
    const [, msg] = (adapter.sendDirectMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { text: string },
    ];
    expect(msg.text).toContain("Usage:");
  });

  it("sends not-found message when request does not exist", async () => {
    const adapter = makeAdapter();
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const leaveRequestService = makeLeaveRequestService(null);
    const deps = makeDeps({
      adapter: adapter as SlackBotAdapter,
      mappingService: mappingService as BotMappingService,
      leaveRequestService: leaveRequestService as LeaveRequestService,
    });

    await handleLeaveCommand(
      { ...BASE_PAYLOAD, text: "status 6507c7db1c71e600a7c7db01" },
      deps
    );

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
    const [, msg] = (adapter.sendDirectMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { text: string },
    ];
    expect(msg.text).toContain("not found");
  });
});
