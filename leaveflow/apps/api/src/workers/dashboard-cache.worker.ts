/**
 * Dashboard cache worker — pre-computes expensive dashboard widgets per tenant.
 *
 * Runs as a BullMQ repeatable job every 5 minutes.
 * Stores the full DashboardSummary in Redis with a 5-minute TTL.
 * The dashboard route reads from cache when available, falls back to live query.
 */

import type { DashboardCacheJobData } from "../lib/bullmq.js";
import type { DashboardService } from "../modules/dashboard/dashboard.service.js";

// ----------------------------------------------------------------
// Cache constants (exported for tests and the dashboard service)
// ----------------------------------------------------------------

export const CACHE_KEY_PREFIX = "dashboard:summary";
export const CACHE_TTL_SECONDS = 300; // 5 minutes

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface IDashboardServiceDep {
  getSummary(tenantId: string): Promise<unknown>;
}

export interface IRedisClientDep {
  set(key: string, value: string, mode: "EX", ttl: number): Promise<unknown>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
}

export interface DashboardCacheWorkerDeps {
  dashboardService: IDashboardServiceDep;
  redisClient: IRedisClientDep;
}

// ----------------------------------------------------------------
// Cache key helpers (exported so dashboard service can use them)
// ----------------------------------------------------------------

export function buildCacheKey(tenantId: string): string {
  return `${CACHE_KEY_PREFIX}:${tenantId}`;
}

// ----------------------------------------------------------------
// Job processor
// ----------------------------------------------------------------

/**
 * Processes a dashboard cache refresh job for a single tenant.
 *
 * Steps:
 * 1. Call dashboardService.getSummary(tenantId) to compute all widgets
 * 2. Serialize to JSON
 * 3. Store in Redis with TTL=5min under key "dashboard:summary:{tenantId}"
 */
export async function processDashboardCacheJob(
  data: DashboardCacheJobData,
  deps: DashboardCacheWorkerDeps
): Promise<void> {
  const { tenantId } = data;

  console.info(`[dashboard-cache-worker] Refreshing cache for tenant=${tenantId}`);

  // This may throw — let BullMQ handle the retry
  const summary = await deps.dashboardService.getSummary(tenantId);

  const key = buildCacheKey(tenantId);
  const serialized = JSON.stringify(summary);

  await deps.redisClient.set(key, serialized, "EX", CACHE_TTL_SECONDS);

  console.info(
    `[dashboard-cache-worker] Cache refreshed for tenant=${tenantId} key=${key}`
  );
}

// ----------------------------------------------------------------
// Cache reader (called by dashboard route handler)
// ----------------------------------------------------------------

/**
 * Attempts to read the cached DashboardSummary for a tenant.
 * Returns null when no cache entry exists (triggers a live query).
 */
export async function readDashboardCache<T>(
  tenantId: string,
  redisClient: IRedisClientDep
): Promise<T | null> {
  const key = buildCacheKey(tenantId);
  const raw = await redisClient.get(key);

  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[dashboard-cache] Failed to parse cache for tenant=${tenantId}`);
    return null;
  }
}

// ----------------------------------------------------------------
// BullMQ worker factory
// ----------------------------------------------------------------

import { Worker } from "bullmq";
import { getRedisClient } from "../lib/redis.js";
import { QUEUE_NAMES } from "../lib/bullmq.js";

export interface DashboardCacheBullWorkerDeps {
  dashboardService: DashboardService;
}

export function createDashboardCacheWorker(
  deps: DashboardCacheBullWorkerDeps
): Worker<DashboardCacheJobData> {
  const redisClient = getRedisClient();

  const worker = new Worker<DashboardCacheJobData>(
    QUEUE_NAMES.DASHBOARD_CACHE,
    async (job) => {
      await processDashboardCacheJob(job.data, {
        dashboardService: deps.dashboardService,
        redisClient: redisClient as unknown as IRedisClientDep,
      });
    },
    {
      connection: redisClient,
      concurrency: 3,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[dashboard-cache-worker] Job ${job?.id ?? "unknown"} failed:`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("[dashboard-cache-worker] Worker error:", err.message);
  });

  return worker;
}
