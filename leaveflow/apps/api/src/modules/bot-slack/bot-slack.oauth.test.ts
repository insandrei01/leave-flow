/**
 * Slack OAuth handler tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleSlackOAuthCallback,
  type SlackOAuthCallbackInput,
  type SlackOAuthDeps,
} from "./bot-slack.oauth.js";

// ----------------------------------------------------------------
// Mock the TenantModel to avoid real DB connections
// ----------------------------------------------------------------

vi.mock("../../models/index.js", () => {
  return {
    TenantModel: {
      findOneAndUpdate: vi.fn().mockResolvedValue({ _id: "tenant-001" }),
    },
  };
});

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeExchangeCodeFn(
  overrides: Partial<Awaited<ReturnType<SlackOAuthDeps["exchangeCodeForToken"]>>> = {}
): SlackOAuthDeps["exchangeCodeForToken"] {
  return vi.fn().mockResolvedValue({
    ok: true,
    access_token: "xoxb-slack-token",
    bot_user_id: "U_BOT_001",
    team: { id: "T_TEAM_001", name: "Acme Corp" },
    authed_user: { id: "U_INSTALLER_001" },
    ...overrides,
  });
}

function makeDeps(overrides: Partial<SlackOAuthDeps> = {}): SlackOAuthDeps {
  return {
    exchangeCodeForToken: overrides.exchangeCodeForToken ?? makeExchangeCodeFn(),
    encrypt: overrides.encrypt ?? vi.fn((v: string) => `enc:${v}`),
    syncWorkspaceMembers: overrides.syncWorkspaceMembers ?? vi.fn().mockResolvedValue(undefined),
  };
}

const VALID_INPUT: SlackOAuthCallbackInput = {
  code: "slack-oauth-code-123",
  tenantId: "tenant-001",
};

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("handleSlackOAuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls exchangeCodeForToken with the provided code", async () => {
    const deps = makeDeps();

    await handleSlackOAuthCallback(VALID_INPUT, deps);

    expect(deps.exchangeCodeForToken).toHaveBeenCalledWith("slack-oauth-code-123");
  });

  it("encrypts the bot token before storage", async () => {
    const encrypt = vi.fn().mockReturnValue("encrypted-token");
    const deps = makeDeps({ encrypt });

    await handleSlackOAuthCallback(VALID_INPUT, deps);

    expect(encrypt).toHaveBeenCalledWith("xoxb-slack-token");
  });

  it("calls syncWorkspaceMembers with the team ID", async () => {
    const syncWorkspaceMembers = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ syncWorkspaceMembers });

    await handleSlackOAuthCallback(VALID_INPUT, deps);

    expect(syncWorkspaceMembers).toHaveBeenCalledOnce();
    const [tenantId, platform, teamId] = (syncWorkspaceMembers as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, string, string];
    expect(tenantId).toBe("tenant-001");
    expect(platform).toBe("slack");
    expect(teamId).toBe("T_TEAM_001");
  });

  it("throws when OAuth exchange returns not ok", async () => {
    const exchangeCodeForToken = vi.fn().mockResolvedValue({ ok: false, error: "invalid_code" });
    const deps = makeDeps({ exchangeCodeForToken });

    await expect(
      handleSlackOAuthCallback({ code: "bad-code", tenantId: "tenant-001" }, deps)
    ).rejects.toThrow("Slack OAuth exchange failed");
  });

  it("throws when code is empty", async () => {
    const deps = makeDeps();

    await expect(
      handleSlackOAuthCallback({ code: "", tenantId: "tenant-001" }, deps)
    ).rejects.toThrow("code");
  });
});
