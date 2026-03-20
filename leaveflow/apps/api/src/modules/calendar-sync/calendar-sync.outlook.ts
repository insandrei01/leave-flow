/**
 * Outlook Calendar sync adapter.
 *
 * Creates and deletes OOO events on the employee's Outlook Calendar
 * using the Microsoft Graph API (/me/events).
 *
 * The adapter receives a pre-configured Graph client instance,
 * making it testable without network calls.
 */

import type { ICalendarSyncAdapter, OooEventPayload } from "./calendar-sync.types.js";

// ----------------------------------------------------------------
// Minimal Microsoft Graph client interface
// ----------------------------------------------------------------

export interface OutlookCalendarClient {
  api(path: string): {
    post(body: Record<string, unknown>): Promise<{ id?: string }>;
    delete(): Promise<unknown>;
  };
}

export interface OutlookCalendarSyncDeps {
  client: OutlookCalendarClient;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createOutlookCalendarSync(
  deps: OutlookCalendarSyncDeps
): ICalendarSyncAdapter {
  const { client } = deps;

  return {
    /**
     * Creates an all-day OOO event on the employee's Outlook Calendar.
     * Uses /me/events endpoint authenticated by the provided access token.
     * All-day events use isAllDay: true with date-only start/end.
     */
    async createEvent(accessToken: string, payload: OooEventPayload): Promise<string> {
      // The client is pre-initialized with the bearer token externally.
      // We call the user's events endpoint on their behalf.
      const response = await client
        .api("/me/events")
        .post({
          subject: payload.summary,
          body: {
            contentType: "text",
            content: payload.description ?? "",
          },
          start: {
            dateTime: `${payload.startDate}T00:00:00`,
            timeZone: "UTC",
          },
          end: {
            dateTime: `${payload.endDate}T23:59:59`,
            timeZone: "UTC",
          },
          isAllDay: true,
          showAs: "oof", // "Out of Office"
          sensitivity: "normal",
        });

      const eventId = response.id;
      if (eventId === undefined || eventId === "") {
        throw new Error(
          `Microsoft Graph API returned no event ID for event: ${payload.summary}`
        );
      }

      return eventId;
    },

    /**
     * Deletes an existing OOO event from the employee's Outlook Calendar.
     */
    async deleteEvent(_accessToken: string, eventId: string): Promise<void> {
      await client.api(`/me/events/${eventId}`).delete();
    },
  };
}
