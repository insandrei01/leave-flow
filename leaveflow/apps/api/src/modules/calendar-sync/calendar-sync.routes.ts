/**
 * Calendar sync OAuth routes.
 *
 * GET  /calendar-sync/google/connect   — redirect to Google OAuth consent
 * GET  /calendar-sync/google/callback  — handle Google OAuth callback
 * GET  /calendar-sync/outlook/connect  — redirect to Outlook OAuth consent
 * GET  /calendar-sync/outlook/callback — handle Outlook OAuth callback
 * GET  /calendar-sync/status           — return connection status for the current user
 * DELETE /calendar-sync/:provider      — disconnect a calendar integration
 *
 * Security:
 * - OAuth state is a one-time Redis nonce (TTL 600 s) to prevent CSRF.
 * - Access and refresh tokens are encrypted with AES-256-GCM before storage.
 * - All OAuthTokenModel queries include tenantId for proper tenant isolation.
 */

import { randomBytes } from "node:crypto";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { OAuthTokenModel } from "../../models/index.js";
import { sendSuccess, sendNoContent } from "../../lib/response.js";
import { ValidationError, NotFoundError } from "../../lib/errors.js";
import { encrypt, decrypt } from "../../lib/crypto.js";
import { getRedisClient } from "../../lib/redis.js";

// ----------------------------------------------------------------
// Configuration interface
// ----------------------------------------------------------------

export interface CalendarOAuthConfig {
  google: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  outlook: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    tenantId: string;
  };
  appBaseUrl: string;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
].join(" ");

const OUTLOOK_AUTH_URL_TEMPLATE = (azureTenantId: string) =>
  `https://login.microsoftonline.com/${azureTenantId}/oauth2/v2.0/authorize`;
const OUTLOOK_SCOPES = [
  "Calendars.ReadWrite",
  "offline_access",
  "openid",
  "email",
].join(" ");

/** TTL (seconds) for OAuth state nonces stored in Redis. */
const OAUTH_STATE_TTL_SECONDS = 600;

const PROVIDER_SCHEMA = z.object({
  provider: z.enum(["google_calendar", "outlook_calendar"]),
});

const CALLBACK_QUERY_SCHEMA = z.object({
  code: z.string().min(1),
  state: z.string().optional(),
  error: z.string().optional(),
});

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface OAuthStatePayload {
  employeeId: string;
  tenantId: string;
}

// ----------------------------------------------------------------
// Redis nonce helpers
// ----------------------------------------------------------------

function oauthStateKey(nonce: string): string {
  return `oauth-state:${nonce}`;
}

async function storeOAuthState(
  payload: OAuthStatePayload
): Promise<string> {
  const nonce = randomBytes(32).toString("hex");
  const redis = getRedisClient();
  await redis.set(
    oauthStateKey(nonce),
    JSON.stringify(payload),
    "EX",
    OAUTH_STATE_TTL_SECONDS
  );
  return nonce;
}

/**
 * Retrieves and atomically deletes the OAuth state nonce from Redis.
 * Returns null if the nonce was not found or has expired.
 */
async function consumeOAuthState(
  nonce: string
): Promise<OAuthStatePayload | null> {
  const redis = getRedisClient();
  const key = oauthStateKey(nonce);
  const raw = await redis.getdel(key);
  if (raw === null) {
    return null;
  }
  return JSON.parse(raw) as OAuthStatePayload;
}

// ----------------------------------------------------------------
// URL builders
// ----------------------------------------------------------------

function buildGoogleAuthUrl(config: CalendarOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

function buildOutlookAuthUrl(
  config: CalendarOAuthConfig,
  state: string
): string {
  const params = new URLSearchParams({
    client_id: config.outlook.clientId,
    redirect_uri: config.outlook.redirectUri,
    response_type: "code",
    scope: OUTLOOK_SCOPES,
    state,
  });
  return `${OUTLOOK_AUTH_URL_TEMPLATE(config.outlook.tenantId)}?${params.toString()}`;
}

// ----------------------------------------------------------------
// Token exchange helpers
// ----------------------------------------------------------------

async function exchangeGoogleCode(
  code: string,
  config: CalendarOAuthConfig
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed: ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

async function exchangeOutlookCode(
  code: string,
  config: CalendarOAuthConfig
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const url = `https://login.microsoftonline.com/${config.outlook.tenantId}/oauth2/v2.0/token`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: config.outlook.clientId,
      client_secret: config.outlook.clientSecret,
      redirect_uri: config.outlook.redirectUri,
      grant_type: "authorization_code",
      scope: OUTLOOK_SCOPES,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Outlook token exchange failed: ${body}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? "",
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

// ----------------------------------------------------------------
// Route factory
// ----------------------------------------------------------------

export function createCalendarSyncRoutes(config: CalendarOAuthConfig) {
  return async function calendarSyncRoutes(
    app: FastifyInstance
  ): Promise<void> {
    // GET /calendar-sync/google/connect
    app.get(
      "/calendar-sync/google/connect",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const { employeeId, tenantId } = request.auth!;
        const nonce = await storeOAuthState({ employeeId, tenantId });
        const url = buildGoogleAuthUrl(config, nonce);
        return reply.code(302).redirect(url);
      }
    );

    // GET /calendar-sync/google/callback
    app.get(
      "/calendar-sync/google/callback",
      { config: { public: true } },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const query = CALLBACK_QUERY_SCHEMA.safeParse(request.query);
        if (!query.success) {
          throw new ValidationError("Invalid OAuth callback parameters");
        }

        if (query.data.error) {
          return reply
            .code(302)
            .redirect(
              `${config.appBaseUrl}/settings/calendar?error=${encodeURIComponent(query.data.error)}`
            );
        }

        const nonce = query.data.state ?? "";
        const statePayload = await consumeOAuthState(nonce);
        if (statePayload === null) {
          throw new ValidationError("Invalid or expired OAuth state");
        }

        const { employeeId, tenantId } = statePayload;
        const tokens = await exchangeGoogleCode(query.data.code, config);

        await OAuthTokenModel.findOneAndUpdate(
          { tenantId, employeeId, service: "google_calendar" },
          {
            $set: {
              encryptedAccessToken: encrypt(tokens.accessToken),
              encryptedRefreshToken: encrypt(tokens.refreshToken),
              tokenExpiresAt: tokens.expiresAt,
              isActive: true,
            },
            $setOnInsert: {
              tenantId,
              employeeId,
              service: "google_calendar",
            },
          },
          { upsert: true, new: true }
        );

        return reply
          .code(302)
          .redirect(`${config.appBaseUrl}/settings/calendar?connected=google`);
      }
    );

    // GET /calendar-sync/outlook/connect
    app.get(
      "/calendar-sync/outlook/connect",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const { employeeId, tenantId } = request.auth!;
        const nonce = await storeOAuthState({ employeeId, tenantId });
        const url = buildOutlookAuthUrl(config, nonce);
        return reply.code(302).redirect(url);
      }
    );

    // GET /calendar-sync/outlook/callback
    app.get(
      "/calendar-sync/outlook/callback",
      { config: { public: true } },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const query = CALLBACK_QUERY_SCHEMA.safeParse(request.query);
        if (!query.success) {
          throw new ValidationError("Invalid OAuth callback parameters");
        }

        if (query.data.error) {
          return reply
            .code(302)
            .redirect(
              `${config.appBaseUrl}/settings/calendar?error=${encodeURIComponent(query.data.error)}`
            );
        }

        const nonce = query.data.state ?? "";
        const statePayload = await consumeOAuthState(nonce);
        if (statePayload === null) {
          throw new ValidationError("Invalid or expired OAuth state");
        }

        const { employeeId, tenantId } = statePayload;
        const tokens = await exchangeOutlookCode(query.data.code, config);

        await OAuthTokenModel.findOneAndUpdate(
          { tenantId, employeeId, service: "outlook_calendar" },
          {
            $set: {
              encryptedAccessToken: encrypt(tokens.accessToken),
              encryptedRefreshToken: encrypt(tokens.refreshToken),
              tokenExpiresAt: tokens.expiresAt,
              isActive: true,
            },
            $setOnInsert: {
              tenantId,
              employeeId,
              service: "outlook_calendar",
            },
          },
          { upsert: true, new: true }
        );

        return reply
          .code(302)
          .redirect(`${config.appBaseUrl}/settings/calendar?connected=outlook`);
      }
    );

    // GET /calendar-sync/status
    app.get(
      "/calendar-sync/status",
      async (request: FastifyRequest, reply: FastifyReply) => {
        const { employeeId, tenantId } = request.auth!;

        const tokens = await OAuthTokenModel.find({
          tenantId,
          employeeId,
          isActive: true,
        })
          .select("service tokenExpiresAt")
          .lean();

        const connections = tokens.map((t) => ({
          provider: t.service,
          isActive: true,
          expiresAt: t.tokenExpiresAt,
        }));

        return sendSuccess(reply, { connections });
      }
    );

    // DELETE /calendar-sync/:provider
    app.delete(
      "/calendar-sync/:provider",
      async (
        request: FastifyRequest<{ Params: { provider: string } }>,
        reply: FastifyReply
      ) => {
        const params = PROVIDER_SCHEMA.safeParse(request.params);
        if (!params.success) {
          throw new ValidationError(
            "Invalid provider. Must be google_calendar or outlook_calendar"
          );
        }

        const { employeeId, tenantId } = request.auth!;

        const result = await OAuthTokenModel.findOneAndUpdate(
          {
            tenantId,
            employeeId,
            service: params.data.provider,
            isActive: true,
          },
          { $set: { isActive: false } }
        );

        if (result === null) {
          throw new NotFoundError("Calendar connection", params.data.provider);
        }

        return sendNoContent(reply);
      }
    );
  };
}
