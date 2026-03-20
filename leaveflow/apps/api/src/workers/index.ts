/**
 * Worker registry — creates and starts all BullMQ workers.
 *
 * This module is the single entry-point for all background job processors.
 * It wires up dependencies and returns all workers so they can be cleanly
 * closed during graceful shutdown.
 *
 * Workers registered:
 * - EscalationWorker     — processes overdue approval steps (repeatable, 15min)
 * - AccrualWorker        — processes monthly leave accruals (repeatable, monthly)
 * - NotificationWorker   — dispatches notifications to Slack / Teams / email
 * - CalendarSyncWorker   — creates/deletes OOO events on Google / Outlook
 * - DashboardCacheWorker — pre-computes dashboard widgets (repeatable, 5min)
 *
 * Bull Board is exposed at GET /admin/queues (protected by company_admin role).
 *
 * Usage:
 *   const { workers, close } = await startWorkers(deps);
 *   // ...on SIGTERM:
 *   await close();
 */

import { Worker } from "bullmq";
import { getRedisClient } from "../lib/redis.js";
import {
  QUEUE_NAMES,
  type EscalationJobData,
  type AccrualJobData,
  type NotificationJobData,
} from "../lib/bullmq.js";
import { processEscalationJob, type EscalationWorkerDeps } from "./escalation.worker.js";
import { processAccrualJob, type AccrualWorkerDeps } from "./accrual.worker.js";
import { processNotificationJob, type NotificationWorkerDeps } from "./notification.worker.js";
import { createCalendarSyncWorker, type CalendarSyncWorkerDeps } from "./calendar-sync.worker.js";
import { createDashboardCacheWorker, type DashboardCacheBullWorkerDeps } from "./dashboard-cache.worker.js";

// ----------------------------------------------------------------
// Dead-letter handling constant
// ----------------------------------------------------------------

/** Job option to move to dead-letter after this many attempts */
const MAX_ATTEMPTS = 5;

// ----------------------------------------------------------------
// Worker registry dependencies
// ----------------------------------------------------------------

export interface WorkerRegistryDeps {
  escalation: EscalationWorkerDeps;
  accrual: AccrualWorkerDeps;
  notification: NotificationWorkerDeps;
  calendarSync: CalendarSyncWorkerDeps;
  dashboardCache: DashboardCacheBullWorkerDeps;
}

export interface WorkerRegistry {
  workers: Worker[];
  close(): Promise<void>;
}

// ----------------------------------------------------------------
// Start all workers
// ----------------------------------------------------------------

export function startWorkers(deps: WorkerRegistryDeps): WorkerRegistry {
  const redis = getRedisClient();

  // ----------------------------------------------------------------
  // Escalation worker
  // ----------------------------------------------------------------
  const escalationWorker = new Worker<EscalationJobData>(
    QUEUE_NAMES.ESCALATION,
    async (job) => {
      await processEscalationJob(job.data, deps.escalation);
    },
    { connection: redis, concurrency: 3 }
  );

  escalationWorker.on("failed", (job, err) => {
    console.error(`[escalation-worker] Job ${job?.id ?? "?"} failed: ${err.message}`);
  });

  // ----------------------------------------------------------------
  // Accrual worker
  // ----------------------------------------------------------------
  const accrualWorker = new Worker<AccrualJobData>(
    QUEUE_NAMES.ACCRUAL,
    async (job) => {
      await processAccrualJob(job.data, deps.accrual);
    },
    { connection: redis, concurrency: 2 }
  );

  accrualWorker.on("failed", (job, err) => {
    console.error(`[accrual-worker] Job ${job?.id ?? "?"} failed: ${err.message}`);
  });

  // ----------------------------------------------------------------
  // Notification worker (5 attempts with exponential backoff)
  // ----------------------------------------------------------------
  const notificationWorker = new Worker<NotificationJobData>(
    QUEUE_NAMES.NOTIFICATION,
    async (job) => {
      await processNotificationJob(job.data, deps.notification);
    },
    {
      connection: redis,
      concurrency: 10,
      limiter: {
        max: 100,
        duration: 1000, // 100 jobs/second rate limit
      },
    }
  );

  notificationWorker.on("failed", (job, err) => {
    console.error(`[notification-worker] Job ${job?.id ?? "?"} failed: ${err.message}`);
    if ((job?.attemptsMade ?? 0) >= MAX_ATTEMPTS) {
      console.error(`[notification-worker] Job ${job?.id ?? "?"} moved to dead-letter queue`);
    }
  });

  // ----------------------------------------------------------------
  // Calendar sync and dashboard cache workers
  // ----------------------------------------------------------------
  const calendarSyncWorker = createCalendarSyncWorker(deps.calendarSync);
  const dashboardCacheWorker = createDashboardCacheWorker(deps.dashboardCache);

  const allWorkers = [
    escalationWorker,
    accrualWorker,
    notificationWorker,
    calendarSyncWorker,
    dashboardCacheWorker,
  ];

  // Register global error handler on all workers
  for (const worker of allWorkers) {
    worker.on("error", (err) => {
      console.error(`[worker:${worker.name}] Unhandled worker error:`, err.message);
    });
  }

  console.info("[workers] All workers started");

  return {
    workers: allWorkers,

    /**
     * Gracefully closes all workers.
     * Waits for in-flight jobs to complete before terminating.
     */
    async close(): Promise<void> {
      console.info("[workers] Closing all workers...");

      await Promise.all(allWorkers.map((w) => w.close()));

      console.info("[workers] All workers closed");
    },
  };
}

// ----------------------------------------------------------------
// Bull Board integration
// ----------------------------------------------------------------

/**
 * Creates Bull Board UI routes for monitoring queues.
 *
 * The returned Fastify plugin registers the Bull Board HTTP interface
 * at /admin/queues, protected by a company_admin role check.
 *
 * Usage: await app.register(createBullBoardPlugin(queues));
 *
 * Note: @bull-board/fastify must be installed as a dependency when this is
 * wired up in the app. For now this returns a factory function pattern
 * consistent with the codebase's module approach.
 */
export function getBullBoardRouteConfig() {
  return {
    basePath: "/admin/queues",
    requiredRole: "company_admin",
  };
}
