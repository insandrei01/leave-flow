/**
 * Rate limiter plugin — per-plan tiered rate limiting using @fastify/rate-limit.
 *
 * Rate limits per plan tier (requests per minute):
 *   Free:       60
 *   Team:       300
 *   Business:   600
 *   Enterprise: 1200
 *
 * Per-endpoint tier overrides:
 *   Auth paths (/auth/*):              10/min  — brute-force protection
 *   Bot webhook paths (/slack/, /teams/): 1000/min — high-volume webhooks
 *
 * Plan is resolved from the tenant record in the database.
 * Resolved plans are cached in Redis under key `tenant-plan:{tenantId}`
 * with a 300-second TTL to avoid per-request DB lookups.
 *
 * Response headers:
 *   X-RateLimit-Limit     — max requests allowed
 *   X-RateLimit-Remaining — requests remaining in current window
 *   X-RateLimit-Reset     — window reset time (Unix epoch seconds)
 *   Retry-After           — seconds to wait (only on 429 responses)
 *
 * On exceed: 429 with standard error envelope.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";
import type { Redis } from "ioredis";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const WINDOW_MS = 60 * 1000; // 1 minute

const PLAN_LIMITS: Record<string, number> = {
  free: 60,
  team: 300,
  business: 600,
  enterprise: 1200,
};

const DEFAULT_LIMIT = 60; // fallback when plan is unknown
const BOT_LIMIT = 1000;
const AUTH_LIMIT = 10; // strict limit for auth endpoints (brute-force protection)

const BOT_WEBHOOK_PREFIXES = ["/slack/", "/teams/"] as const;
const AUTH_PREFIXES = ["/auth/"] as const;

/** Redis key prefix for cached tenant plan values */
const TENANT_PLAN_CACHE_PREFIX = "tenant-plan";
/** Tenant plan cache TTL in seconds */
const TENANT_PLAN_CACHE_TTL_SECONDS = 300;

// ----------------------------------------------------------------
// Plugin options
// ----------------------------------------------------------------

export interface ITenantPlanModelDep {
  findOne(
    query: Record<string, unknown>,
    projection: Record<string, unknown>
  ): { lean<T>(): Promise<T | null> };
}

export interface RateLimiterOptions {
  redis?: Redis;
  tenantPlanModel?: ITenantPlanModelDep;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function isBotWebhookPath(url: string): boolean {
  return BOT_WEBHOOK_PREFIXES.some((prefix) => url.startsWith(prefix));
}

function isAuthPath(url: string): boolean {
  return AUTH_PREFIXES.some((prefix) => url.startsWith(prefix));
}

/**
 * Resolves the tenant plan from Redis cache, falling back to a DB lookup.
 * Returns the plan string (e.g. "free", "team", "business", "enterprise").
 * Returns "free" on any error so rate limiting degrades safely.
 */
async function resolveTenantPlan(
  tenantId: string,
  redis: Redis | undefined,
  tenantPlanModel: ITenantPlanModelDep | undefined
): Promise<string> {
  // Try Redis cache first
  if (redis !== undefined) {
    try {
      const cacheKey = `${TENANT_PLAN_CACHE_PREFIX}:${tenantId}`;
      const cached = await redis.get(cacheKey);
      if (cached !== null) {
        return cached;
      }
    } catch {
      // Cache miss or Redis error — fall through to DB lookup
    }
  }

  // DB lookup
  if (tenantPlanModel !== undefined) {
    try {
      const tenant = await tenantPlanModel
        .findOne({ _id: tenantId }, { plan: 1 })
        .lean<{ plan?: string }>();

      const plan = tenant?.plan ?? "free";

      // Populate cache if Redis is available
      if (redis !== undefined && plan !== undefined) {
        const cacheKey = `${TENANT_PLAN_CACHE_PREFIX}:${tenantId}`;
        await redis
          .set(cacheKey, plan, "EX", TENANT_PLAN_CACHE_TTL_SECONDS)
          .catch(() => {
            // Non-fatal: cache write failure does not block the request
          });
      }

      return plan;
    } catch {
      // DB lookup failed — fall through to default
    }
  }

  return "free";
}

function buildKeyGenerator(request: FastifyRequest): string {
  if (isBotWebhookPath(request.url)) {
    // Rate-limit bots by IP since they don't carry JWT
    return `bot:${request.ip}`;
  }
  if (isAuthPath(request.url)) {
    // Rate-limit auth by IP to prevent distributed brute-force
    return `auth:${request.ip}`;
  }
  const tenantId = request.auth?.tenantId ?? "anon";
  const employeeId = request.auth?.employeeId ?? request.ip;
  return `${tenantId}:${employeeId}`;
}

// ----------------------------------------------------------------
// Plugin
// ----------------------------------------------------------------

async function registerRateLimiterPlugin(
  app: FastifyInstance,
  opts: RateLimiterOptions
): Promise<void> {
  const storeOptions = opts.redis !== undefined
    ? { store: opts.redis }
    : {};

  await app.register(rateLimit, {
    global: true,
    timeWindow: WINDOW_MS,
    max: async (request: FastifyRequest, _key: string) => {
      if (isBotWebhookPath(request.url)) {
        return BOT_LIMIT;
      }
      if (isAuthPath(request.url)) {
        return AUTH_LIMIT;
      }

      const tenantId = request.auth?.tenantId;
      if (tenantId === undefined) {
        return DEFAULT_LIMIT;
      }

      const plan = await resolveTenantPlan(
        tenantId,
        opts.redis,
        opts.tenantPlanModel
      );
      return PLAN_LIMITS[plan] ?? DEFAULT_LIMIT;
    },
    keyGenerator: (request: FastifyRequest) => buildKeyGenerator(request),
    addHeadersOnExceeding: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
    },
    addHeaders: {
      "x-ratelimit-limit": true,
      "x-ratelimit-remaining": true,
      "x-ratelimit-reset": true,
      "retry-after": true,
    },
    errorResponseBuilder: (
      _request: FastifyRequest,
      context: { max: number; after: string }
    ) => ({
      success: false,
      data: null,
      error: {
        code: "RATE_LIMIT_EXCEEDED",
        message: `Too many requests. Limit is ${context.max} per minute. Try again in ${context.after}.`,
        details: null,
      },
      meta: null,
    }),
    ...storeOptions,
  });

  // Ensure 429 status code on rate limit errors
  app.addHook(
    "onSend",
    async (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      if (reply.statusCode === 429) {
        // Rename headers to X-RateLimit-* case for consistency
        const limit = reply.getHeader("x-ratelimit-limit");
        const remaining = reply.getHeader("x-ratelimit-remaining");
        const reset = reply.getHeader("x-ratelimit-reset");

        if (limit !== undefined) {
          reply.header("X-RateLimit-Limit", limit);
        }
        if (remaining !== undefined) {
          reply.header("X-RateLimit-Remaining", remaining);
        }
        if (reset !== undefined) {
          reply.header("X-RateLimit-Reset", reset);
        }
      }
    }
  );
}

export const rateLimiterPlugin = fp(registerRateLimiterPlugin, {
  name: "rate-limiter-plugin",
  fastify: "5.x",
});
