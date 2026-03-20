/**
 * Teams command handler tests — unit tests with mocked adapter and services.
 */

import { describe, it, expect, vi } from "vitest";
import {
  handleLeaveCommand,
  type TeamsCommandPayload,
  type TeamsCommandsDeps,
} from "./bot-teams.commands.js";
import type { TeamsBotAdapter } from "./bot-teams.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { BalanceService } from "../balance/balance.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";

// ----------------------------------------------------------------
// Mock builders
// ----------------------------------------------------------------

function makeAdapter(): Partial<TeamsBotAdapter> {
  return {
    sendLeaveRequestForm: vi.fn().mockResolvedValue(undefined),
    sendDirectMessage: vi
      .fn()
      .mockResolvedValue({ platform: "teams", channelId: "conv-001", messageId: "act-001" }),
  };
}

function makeMappingService(
  resolved: { tenantId: string; employeeId: string; conversationReference: null } | null = null
): Partial<BotMappingService> {
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

function makeDeps(overrides: Partial<TeamsCommandsDeps> = {}): TeamsCommandsDeps {
  return {
    adapter: (overrides.adapter ?? makeAdapter()) as TeamsBotAdapter,
    mappingService: (overrides.mappingService ?? makeMappingService()) as BotMappingService,
    balanceService: (overrides.balanceService ?? makeBalanceService()) as BalanceService,
    leaveRequestService:
      (overrides.leaveRequestService ?? makeLeaveRequestService()) as LeaveRequestService,
    leaveTypes: [{ id: "lt-001", name: "PTO" }],
  };
}

const BASE_PAYLOAD: TeamsCommandPayload = {
  text: "/leave",
  platformUserId: "teams-user-001",
  conversationId: "conv-001",
  serviceUrl: "https://smba.trafficmanager.net/amer/",
};

// ----------------------------------------------------------------
// /leave (default — opens form card)
// ----------------------------------------------------------------

describe("handleLeaveCommand — /leave (default)", () => {
  it("calls sendLeaveRequestForm with the user id", async () => {
    const adapter = makeAdapter();
    const deps = makeDeps({ adapter: adapter as TeamsBotAdapter });

    await handleLeaveCommand(BASE_PAYLOAD, deps);

    expect(adapter.sendLeaveRequestForm).toHaveBeenCalledOnce();
    const [ctx] = (adapter.sendLeaveRequestForm as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { platformUserId: string; leaveTypes: unknown[] },
    ];
    expect(ctx.platformUserId).toBe("teams-user-001");
  });

  it("passes configured leaveTypes to the form", async () => {
    const adapter = makeAdapter();
    const deps = makeDeps({ adapter: adapter as TeamsBotAdapter });

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
      adapter: adapter as TeamsBotAdapter,
      mappingService: mappingService as BotMappingService,
    });

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "/leave balance" }, deps);

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

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "/leave balance" }, deps);

    expect(balanceService.getEmployeeBalances).toHaveBeenCalledOnce();
  });

  it("sends DM with balance data when connected", async () => {
    const adapter = makeAdapter();
    const balanceService = makeBalanceService([
      { leaveTypeName: "PTO", used: 5, allocated: 20 },
    ]);
    const mappingService = makeMappingService({
      tenantId: "t-001",
      employeeId: "6507c7db1c71e600a7c7db01",
      conversationReference: null,
    });
    const deps = makeDeps({
      adapter: adapter as TeamsBotAdapter,
      balanceService: balanceService as BalanceService,
      mappingService: mappingService as BotMappingService,
    });

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "/leave balance" }, deps);

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
  });
});

// ----------------------------------------------------------------
// /leave status
// ----------------------------------------------------------------

describe("handleLeaveCommand — /leave status", () => {
  it("sends DM with usage hint when no requestId given", async () => {
    const adapter = makeAdapter();
    const deps = makeDeps({ adapter: adapter as TeamsBotAdapter });

    await handleLeaveCommand({ ...BASE_PAYLOAD, text: "/leave status" }, deps);

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
    const [, msg] = (adapter.sendDirectMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { text: string },
    ];
    expect(msg.text).toContain("Usage");
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
      adapter: adapter as TeamsBotAdapter,
      mappingService: mappingService as BotMappingService,
      leaveRequestService: leaveRequestService as LeaveRequestService,
    });

    await handleLeaveCommand(
      { ...BASE_PAYLOAD, text: "/leave status 6507c7db1c71e600a7c7db01" },
      deps
    );

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
    const [, msg] = (adapter.sendDirectMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { text: string },
    ];
    expect(msg.text).toContain("not found");
  });

  it("sends DM when user is not connected", async () => {
    const adapter = makeAdapter();
    const mappingService = makeMappingService(null);
    const deps = makeDeps({
      adapter: adapter as TeamsBotAdapter,
      mappingService: mappingService as BotMappingService,
    });

    await handleLeaveCommand(
      { ...BASE_PAYLOAD, text: "/leave status 6507c7db1c71e600a7c7db01" },
      deps
    );

    expect(adapter.sendDirectMessage).toHaveBeenCalledOnce();
    const [, msg] = (adapter.sendDirectMessage as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      { text: string },
    ];
    expect(msg.text).toContain("not connected");
  });
});
