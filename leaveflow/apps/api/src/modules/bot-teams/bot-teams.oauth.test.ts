/**
 * Teams OAuth handler tests.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleTeamsOAuthCallback,
  type TeamsOAuthCallbackInput,
  type TeamsOAuthDeps,
} from "./bot-teams.oauth.js";

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
  overrides: Partial<Awaited<ReturnType<TeamsOAuthDeps["exchangeCodeForToken"]>>> = {}
): TeamsOAuthDeps["exchangeCodeForToken"] {
  return vi.fn().mockResolvedValue({
    access_token: "teams-access-token",
    refresh_token: "teams-refresh-token",
    expires_in: 3600,
    tenant_id: "ms-tenant-001",
    bot_id: "bot-001",
    service_url: "https://smba.trafficmanager.net/amer/",
    installer_user_id: "user-installer-001",
    ...overrides,
  });
}

function makeDeps(overrides: Partial<TeamsOAuthDeps> = {}): TeamsOAuthDeps {
  return {
    exchangeCodeForToken: overrides.exchangeCodeForToken ?? makeExchangeCodeFn(),
    encrypt: overrides.encrypt ?? vi.fn((v: string) => `enc:${v}`),
    syncWorkspaceMembers: overrides.syncWorkspaceMembers ?? vi.fn().mockResolvedValue(undefined),
  };
}

const VALID_INPUT: TeamsOAuthCallbackInput = {
  code: "teams-oauth-code-123",
  tenantId: "tenant-001",
};

// ----------------------------------------------------------------
// Tests
// ----------------------------------------------------------------

describe("handleTeamsOAuthCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls exchangeCodeForToken with the provided code", async () => {
    const deps = makeDeps();

    await handleTeamsOAuthCallback(VALID_INPUT, deps);

    expect(deps.exchangeCodeForToken).toHaveBeenCalledWith("teams-oauth-code-123");
  });

  it("encrypts both access and refresh tokens", async () => {
    const encrypt = vi.fn().mockReturnValue("encrypted");
    const deps = makeDeps({ encrypt });

    await handleTeamsOAuthCallback(VALID_INPUT, deps);

    expect(encrypt).toHaveBeenCalledWith("teams-access-token");
    expect(encrypt).toHaveBeenCalledWith("teams-refresh-token");
  });

  it("calls syncWorkspaceMembers with ms tenant id", async () => {
    const syncWorkspaceMembers = vi.fn().mockResolvedValue(undefined);
    const deps = makeDeps({ syncWorkspaceMembers });

    await handleTeamsOAuthCallback(VALID_INPUT, deps);

    expect(syncWorkspaceMembers).toHaveBeenCalledOnce();
    const [tenantId, platform, msTenantId] = (
      syncWorkspaceMembers as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string, string];
    expect(tenantId).toBe("tenant-001");
    expect(platform).toBe("teams");
    expect(msTenantId).toBe("ms-tenant-001");
  });

  it("throws when OAuth exchange returns no access_token", async () => {
    const exchangeCodeForToken = vi.fn().mockResolvedValue({
      access_token: "",
      refresh_token: "",
      expires_in: 0,
      tenant_id: "",
      bot_id: "",
      service_url: "",
      installer_user_id: "",
    });
    const deps = makeDeps({ exchangeCodeForToken });

    await expect(
      handleTeamsOAuthCallback({ code: "bad-code", tenantId: "tenant-001" }, deps)
    ).rejects.toThrow("Teams OAuth exchange failed");
  });

  it("throws when code is empty", async () => {
    const deps = makeDeps();

    await expect(
      handleTeamsOAuthCallback({ code: "", tenantId: "tenant-001" }, deps)
    ).rejects.toThrow("code");
  });
});
