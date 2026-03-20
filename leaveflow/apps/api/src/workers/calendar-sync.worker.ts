/**
 * Calendar sync worker — processes calendar-sync queue jobs.
 *
 * Each job creates or deletes an OOO event on Google Calendar or Outlook.
 * Delegates to CalendarSyncService for the actual API calls.
 *
 * Retry strategy: exponential backoff, 5 attempts (configured on queue add).
 */

import { Worker } from "bullmq";
import { getRedisClient } from "../lib/redis.js";
import { QUEUE_NAMES, type CalendarSyncJobData } from "../lib/bullmq.js";
import type { CalendarSyncService } from "../modules/calendar-sync/calendar-sync.service.js";

// ----------------------------------------------------------------
// Worker factory
// ----------------------------------------------------------------

export interface CalendarSyncWorkerDeps {
  calendarSyncService: CalendarSyncService;
}

export function createCalendarSyncWorker(deps: CalendarSyncWorkerDeps): Worker<CalendarSyncJobData> {
  const { calendarSyncService } = deps;

  const worker = new Worker<CalendarSyncJobData>(
    QUEUE_NAMES.CALENDAR_SYNC,
    async (job) => {
      console.info(
        `[calendar-sync-worker] Processing job ${job.id}: action=${job.data.action} service=${job.data.service} tenant=${job.data.tenantId}`
      );

      await calendarSyncService.syncCalendar(job.data);

      console.info(`[calendar-sync-worker] Job ${job.id} completed`);
    },
    {
      connection: getRedisClient(),
      concurrency: 5,
    }
  );

  worker.on("failed", (job, err) => {
    console.error(
      `[calendar-sync-worker] Job ${job?.id ?? "unknown"} failed:`,
      err.message
    );
  });

  worker.on("error", (err) => {
    console.error("[calendar-sync-worker] Worker error:", err.message);
  });

  return worker;
}
