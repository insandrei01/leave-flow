/**
 * Calendar sync service — orchestrates OOO event creation/deletion.
 *
 * Responsibilities:
 * - Load the leave request and OAuth token
 * - Decrypt the access token
 * - Route to the correct adapter (Google / Outlook)
 * - Persist the returned event ID on the leave request
 * - Handle token expiry (skip for now — token refresh is a future enhancement)
 */

import mongoose from "mongoose";
import type { CalendarSyncJobData } from "../../lib/bullmq.js";
import type { ICalendarSyncAdapter } from "./calendar-sync.types.js";
import type {
  ILeaveRequestRepoDep,
  IOAuthTokenRepoDep,
} from "./calendar-sync.types.js";

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface CalendarSyncServiceDeps {
  leaveRequestRepo: ILeaveRequestRepoDep;
  oauthTokenRepo: IOAuthTokenRepoDep;
  googleSync: ICalendarSyncAdapter;
  outlookSync: ICalendarSyncAdapter;
  /** Decrypts an AES-256 encrypted token string, returns plaintext. */
  decryptToken(encrypted: string): string;
}

// ----------------------------------------------------------------
// Service type
// ----------------------------------------------------------------

export interface CalendarSyncService {
  syncCalendar(job: CalendarSyncJobData): Promise<void>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createCalendarSyncService(
  deps: CalendarSyncServiceDeps
): CalendarSyncService {
  const { leaveRequestRepo, oauthTokenRepo, googleSync, outlookSync, decryptToken } = deps;

  return {
    /**
     * Processes a calendar-sync queue job.
     *
     * Steps:
     * 1. Load the leave request
     * 2. Load the OAuth token for the employee + service
     * 3. Decrypt the access token
     * 4. Route to the correct platform adapter
     * 5. Persist the event ID (create) or clear it (delete)
     */
    async syncCalendar(job: CalendarSyncJobData): Promise<void> {
      const { tenantId, leaveRequestId, service, action } = job;

      const leaveRequestObjectId = toObjectId(leaveRequestId);

      const leaveRequest = await leaveRequestRepo.findById(tenantId, leaveRequestObjectId);
      if (leaveRequest === null) {
        console.warn(`[calendar-sync] Leave request not found: ${leaveRequestId}`);
        return;
      }

      const employeeObjectId = toObjectId(job.employeeId);

      const oauthToken = await oauthTokenRepo.findByEmployeeAndService(
        tenantId,
        employeeObjectId,
        service
      );

      if (oauthToken === null) {
        console.warn(
          `[calendar-sync] No OAuth token for employee ${job.employeeId} service=${service}`
        );
        return;
      }

      const accessToken = decryptToken(oauthToken.encryptedAccessToken);
      const adapter = resolveAdapter(service, googleSync, outlookSync);

      if (action === "create") {
        await handleCreate(
          adapter,
          accessToken,
          leaveRequest,
          service,
          leaveRequestObjectId,
          tenantId,
          leaveRequestRepo
        );
      } else if (action === "delete") {
        await handleDelete(
          adapter,
          accessToken,
          leaveRequest,
          service,
          leaveRequestObjectId,
          tenantId,
          leaveRequestRepo
        );
      }
    },
  };
}

// ----------------------------------------------------------------
// Action handlers
// ----------------------------------------------------------------

async function handleCreate(
  adapter: ICalendarSyncAdapter,
  accessToken: string,
  leaveRequest: Awaited<ReturnType<ILeaveRequestRepoDep["findById"]>> & {},
  service: string,
  leaveRequestId: mongoose.Types.ObjectId,
  tenantId: string,
  repo: ILeaveRequestRepoDep
): Promise<void> {
  if (leaveRequest === null) return;

  const payload = buildOooPayload(leaveRequest);
  const eventId = await adapter.createEvent(accessToken, payload);

  const ids =
    service === "google_calendar"
      ? { google: eventId }
      : { outlook: eventId };

  await repo.updateCalendarEventIds(tenantId, leaveRequestId, ids);
}

async function handleDelete(
  adapter: ICalendarSyncAdapter,
  accessToken: string,
  leaveRequest: Awaited<ReturnType<ILeaveRequestRepoDep["findById"]>> & {},
  service: string,
  leaveRequestId: mongoose.Types.ObjectId,
  tenantId: string,
  repo: ILeaveRequestRepoDep
): Promise<void> {
  if (leaveRequest === null) return;

  const eventId =
    service === "google_calendar"
      ? leaveRequest.calendarEventIds.google
      : leaveRequest.calendarEventIds.outlook;

  if (eventId === null || eventId === undefined || eventId === "") {
    console.info(
      `[calendar-sync] No event ID to delete for leave request ${leaveRequestId.toString()} service=${service}`
    );
    return;
  }

  await adapter.deleteEvent(accessToken, eventId);

  const ids =
    service === "google_calendar"
      ? { google: null }
      : { outlook: null };

  await repo.updateCalendarEventIds(tenantId, leaveRequestId, ids);
}

// ----------------------------------------------------------------
// Pure helpers
// ----------------------------------------------------------------

function resolveAdapter(
  service: string,
  googleSync: ICalendarSyncAdapter,
  outlookSync: ICalendarSyncAdapter
): ICalendarSyncAdapter {
  if (service === "google_calendar") {
    return googleSync;
  }
  return outlookSync;
}

function buildOooPayload(
  leaveRequest: NonNullable<Awaited<ReturnType<ILeaveRequestRepoDep["findById"]>>>
) {
  return {
    summary: "Out of Office",
    startDate: toDateString(leaveRequest.startDate),
    endDate: toDateString(leaveRequest.endDate),
    description: leaveRequest.reason,
  };
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function toObjectId(id: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(id);
}
