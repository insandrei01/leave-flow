/**
 * Google Calendar sync adapter.
 *
 * Creates and deletes OOO events on the employee's Google Calendar
 * using the Google Calendar API (calendar.events.insert / delete).
 *
 * The adapter receives a pre-configured Google API client instance,
 * making it testable without network calls.
 */

import type { ICalendarSyncAdapter, OooEventPayload } from "./calendar-sync.types.js";

// ----------------------------------------------------------------
// Minimal Google Calendar client interface
// ----------------------------------------------------------------

export interface GoogleCalendarClient {
  events: {
    insert(params: {
      auth: string;
      calendarId: string;
      requestBody: Record<string, unknown>;
    }): Promise<{ data: { id?: string } }>;
    delete(params: {
      auth: string;
      calendarId: string;
      eventId: string;
    }): Promise<unknown>;
  };
}

export interface GoogleCalendarSyncDeps {
  client: GoogleCalendarClient;
  /** Default calendar to write to; typically "primary" */
  calendarId?: string;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createGoogleCalendarSync(
  deps: GoogleCalendarSyncDeps
): ICalendarSyncAdapter {
  const { client, calendarId = "primary" } = deps;

  return {
    /**
     * Creates an all-day OOO event on the employee's primary Google Calendar.
     * The event uses start.date / end.date (not dateTime) for all-day events.
     * Google Calendar end date is exclusive, so we add one day to endDate.
     */
    async createEvent(accessToken: string, payload: OooEventPayload): Promise<string> {
      const exclusiveEndDate = toExclusiveGoogleEndDate(payload.endDate);

      const response = await client.events.insert({
        auth: accessToken,
        calendarId,
        requestBody: {
          summary: payload.summary,
          description: payload.description ?? undefined,
          start: { date: payload.startDate },
          end: { date: exclusiveEndDate },
          status: "confirmed",
          transparency: "transparent", // Show as "free" to not block calendar
        },
      });

      const eventId = response.data.id;
      if (eventId === undefined || eventId === "") {
        throw new Error(
          `Google Calendar API returned no event ID for event: ${payload.summary}`
        );
      }

      return eventId;
    },

    /**
     * Deletes an existing OOO event from the employee's Google Calendar.
     */
    async deleteEvent(accessToken: string, eventId: string): Promise<void> {
      await client.events.delete({
        auth: accessToken,
        calendarId,
        eventId,
      });
    },
  };
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

/**
 * Google Calendar all-day events use an exclusive end date.
 * Add one day to the inclusive endDate string.
 */
function toExclusiveGoogleEndDate(inclusiveDate: string): string {
  const date = new Date(`${inclusiveDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
