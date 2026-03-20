/**
 * Teams OAuth installation handler.
 *
 * Implements the Microsoft OAuth 2.0 flow for installing the LeaveFlow
 * Teams bot into a tenant. Handles the code exchange and stores encrypted tokens.
 *
 * Routes (registered externally):
 *   GET /teams/install           — redirect to Microsoft consent screen
 *   GET /teams/oauth/callback    — exchange code, store tokens, sync members
 */

import { TenantModel } from "../../models/index.js";

// ----------------------------------------------------------------
// OAuth token response from Microsoft
// ----------------------------------------------------------------

export interface TeamsOAuthTokenResponse {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_in: number;
  readonly tenant_id: string;
  readonly bot_id: string;
  readonly service_url: string;
  readonly installer_user_id: string;
}

// ----------------------------------------------------------------
// Input and dependencies
// ----------------------------------------------------------------

export interface TeamsOAuthCallbackInput {
  readonly code: string;
  readonly tenantId: string;
}

export interface TeamsOAuthDeps {
  /**
   * Exchanges a Microsoft OAuth code for bot tokens.
   * Calls the Microsoft token endpoint under the hood.
   */
  exchangeCodeForToken(code: string): Promise<TeamsOAuthTokenResponse>;
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
    platform: "teams",
    msTenantId: string
  ): Promise<void>;
}

// ----------------------------------------------------------------
// OAuth callback handler
// ----------------------------------------------------------------

/**
 * Handles the Teams OAuth callback after user consent.
 *
 * Steps:
 * 1. Validate the code parameter
 * 2. Exchange code for bot tokens via Microsoft OAuth
 * 3. Encrypt and store tokens in the tenant document
 * 4. Sync workspace members for bot mapping population
 */
export async function handleTeamsOAuthCallback(
  input: TeamsOAuthCallbackInput,
  deps: TeamsOAuthDeps
): Promise<void> {
  if (input.code.trim().length === 0) {
    throw new Error("code is required for Teams OAuth callback");
  }

  const tokenResponse = await deps.exchangeCodeForToken(input.code);

  if (
    tokenResponse.access_token === undefined ||
    tokenResponse.access_token === ""
  ) {
    throw new Error("Teams OAuth exchange failed: no access_token returned");
  }

  const encryptedAccessToken = deps.encrypt(tokenResponse.access_token);
  const encryptedRefreshToken = deps.encrypt(tokenResponse.refresh_token);

  await TenantModel.findOneAndUpdate(
    { _id: input.tenantId },
    {
      $set: {
        "teamsInstallation.tenantId": tokenResponse.tenant_id,
        "teamsInstallation.botId": tokenResponse.bot_id,
        "teamsInstallation.serviceUrl": tokenResponse.service_url,
        "teamsInstallation.installerUserId": tokenResponse.installer_user_id,
        "teamsInstallation.encryptedAccessToken": encryptedAccessToken,
        "teamsInstallation.encryptedRefreshToken": encryptedRefreshToken,
        "teamsInstallation.tokenExpiresAt": new Date(
          Date.now() + tokenResponse.expires_in * 1000
        ),
        "teamsInstallation.installedAt": new Date(),
      },
    }
  );

  await deps.syncWorkspaceMembers(input.tenantId, "teams", tokenResponse.tenant_id);
}

// ----------------------------------------------------------------
// Install redirect URL builder
// ----------------------------------------------------------------

const MS_OAUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";

export interface TeamsInstallParams {
  readonly clientId: string;
  readonly scopes: readonly string[];
  readonly redirectUri: string;
  readonly state: string;
}

/**
 * Builds the Microsoft OAuth authorization URL for the install redirect.
 */
export function buildTeamsInstallUrl(params: TeamsInstallParams): string {
  const url = new URL(MS_OAUTH_URL);
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", params.scopes.join(" "));
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("state", params.state);
  return url.toString();
}
