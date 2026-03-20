/**
 * Slack OAuth installation handler.
 *
 * Implements the OAuth 2.0 flow for installing the LeaveFlow Slack app
 * into a workspace. Handles the code exchange and stores encrypted tokens.
 *
 * Routes (registered externally):
 *   GET /slack/install           — redirect to Slack OAuth consent screen
 *   GET /slack/oauth/callback    — exchange code, store tokens, sync members
 */

import { TenantModel } from "../../models/index.js";

// ----------------------------------------------------------------
// OAuth token response from Slack
// ----------------------------------------------------------------

export interface SlackOAuthTokenResponse {
  readonly ok: boolean;
  readonly error?: string;
  readonly access_token?: string;
  readonly bot_user_id?: string;
  readonly team?: {
    readonly id: string;
    readonly name: string;
  };
  readonly authed_user?: {
    readonly id: string;
  };
}

// ----------------------------------------------------------------
// Input and dependencies
// ----------------------------------------------------------------

export interface SlackOAuthCallbackInput {
  readonly code: string;
  readonly tenantId: string;
}

export interface SlackOAuthDeps {
  /**
   * Exchanges a Slack OAuth code for a bot token.
   * Calls oauth.v2.access under the hood.
   */
  exchangeCodeForToken(code: string): Promise<SlackOAuthTokenResponse>;
  /**
   * Encrypts a plaintext string for storage.
   */
  encrypt(value: string): string;
  /**
   * Syncs workspace members after installation.
   * Used to pre-populate bot mappings.
   */
  syncWorkspaceMembers(
    tenantId: string,
    platform: "slack",
    teamId: string
  ): Promise<void>;
}

// ----------------------------------------------------------------
// OAuth callback handler
// ----------------------------------------------------------------

/**
 * Handles the Slack OAuth callback after user consent.
 *
 * Steps:
 * 1. Validate the code parameter
 * 2. Exchange code for bot token via Slack API
 * 3. Encrypt and store token in the tenant document
 * 4. Sync workspace members for bot mapping population
 */
export async function handleSlackOAuthCallback(
  input: SlackOAuthCallbackInput,
  deps: SlackOAuthDeps
): Promise<void> {
  if (input.code.trim().length === 0) {
    throw new Error("code is required for Slack OAuth callback");
  }

  const tokenResponse = await deps.exchangeCodeForToken(input.code);

  if (!tokenResponse.ok || tokenResponse.access_token === undefined || tokenResponse.access_token === "") {
    throw new Error(
      `Slack OAuth exchange failed: ${tokenResponse.error ?? "no access_token returned"}`
    );
  }

  const encryptedToken = deps.encrypt(tokenResponse.access_token);
  const teamId = tokenResponse.team?.id ?? "";
  const botUserId = tokenResponse.bot_user_id ?? "";
  const installerUserId = tokenResponse.authed_user?.id ?? "";

  await TenantModel.findOneAndUpdate(
    { _id: input.tenantId },
    {
      $set: {
        "slackInstallation.teamId": teamId,
        "slackInstallation.teamName": tokenResponse.team?.name ?? "",
        "slackInstallation.botUserId": botUserId,
        "slackInstallation.encryptedBotToken": encryptedToken,
        "slackInstallation.installerUserId": installerUserId,
        "slackInstallation.installedAt": new Date(),
      },
    }
  );

  await deps.syncWorkspaceMembers(input.tenantId, "slack", teamId);
}

// ----------------------------------------------------------------
// Install redirect URL builder
// ----------------------------------------------------------------

const SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize";

export interface SlackInstallParams {
  readonly clientId: string;
  readonly scopes: readonly string[];
  readonly redirectUri: string;
  readonly state: string;
}

/**
 * Builds the Slack OAuth authorization URL for the install redirect.
 */
export function buildSlackInstallUrl(params: SlackInstallParams): string {
  const url = new URL(SLACK_OAUTH_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("scope", params.scopes.join(","));
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}
