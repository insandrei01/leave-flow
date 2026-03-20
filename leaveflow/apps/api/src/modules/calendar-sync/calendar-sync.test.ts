/**
 * Calendar sync module tests.
 *
 * Tests the service orchestration and Google/Outlook adapters
 * using mocked external API clients.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import mongoose from "mongoose";
import {
  createCalendarSyncService,
  type CalendarSyncServiceDeps,
} from "./calendar-sync.service.js";
import {
  createGoogleCalendarSync,
  type GoogleCalendarClient,
} from "./calendar-sync.google.js";
import {
  createOutlookCalendarSync,
  type OutlookCalendarClient,
} from "./calendar-sync.outlook.js";
import type { CalendarSyncJobData } from "../../lib/bullmq.js";

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

function makeObjectId(): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId();
}

function makeLeaveRequest(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    employeeId: makeObjectId(),
    startDate: new Date("2025-04-01"),
    endDate: new Date("2025-04-05"),
    workingDays: 5,
    reason: "Vacation",
    status: "approved",
    calendarEventIds: { google: null, outlook: null },
    ...overrides,
  };
}

function makeToken(overrides: Record<string, unknown> = {}) {
  return {
    _id: makeObjectId(),
    tenantId: "tenant-a",
    employeeId: makeObjectId(),
    service: "google_calendar" as const,
    encryptedAccessToken: "encrypted-access",
    encryptedRefreshToken: "encrypted-refresh",
    tokenExpiresAt: new Date(Date.now() + 3_600_000),
    isActive: true,
    ...overrides,
  };
}

function makeDeps(overrides: Partial<CalendarSyncServiceDeps> = {}): CalendarSyncServiceDeps {
  return {
    leaveRequestRepo: {
      findById: vi.fn().mockResolvedValue(makeLeaveRequest()),
      updateCalendarEventIds: vi.fn().mockResolvedValue(undefined),
    },
    oauthTokenRepo: {
      findByEmployeeAndService: vi.fn().mockResolvedValue(makeToken()),
      updateToken: vi.fn().mockResolvedValue(undefined),
    },
    googleSync: {
      createEvent: vi.fn().mockResolvedValue("google-event-id-123"),
      deleteEvent: vi.fn().mockResolvedValue(undefined),
    },
    outlookSync: {
      createEvent: vi.fn().mockResolvedValue("outlook-event-id-123"),
      deleteEvent: vi.fn().mockResolvedValue(undefined),
    },
    decryptToken: vi.fn().mockReturnValue("decrypted-token"),
    ...overrides,
  };
}

// ----------------------------------------------------------------
// CalendarSyncService tests
// ----------------------------------------------------------------

describe("CalendarSyncService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("syncCalendar", () => {
    it("does nothing when leave request is not found", async () => {
      const deps = makeDeps({
        leaveRequestRepo: {
          findById: vi.fn().mockResolvedValue(null),
          updateCalendarEventIds: vi.fn(),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: makeObjectId().toString(),
        leaveRequestId: makeObjectId().toString(),
        service: "google_calendar",
        action: "create",
      };

      await service.syncCalendar(jobData);

      expect(deps.googleSync.createEvent).not.toHaveBeenCalled();
    });

    it("does nothing when OAuth token is not found", async () => {
      const deps = makeDeps({
        oauthTokenRepo: {
          findByEmployeeAndService: vi.fn().mockResolvedValue(null),
          updateToken: vi.fn(),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: makeObjectId().toString(),
        leaveRequestId: makeObjectId().toString(),
        service: "google_calendar",
        action: "create",
      };

      await service.syncCalendar(jobData);

      expect(deps.googleSync.createEvent).not.toHaveBeenCalled();
    });

    it("calls googleSync.createEvent on create action for google_calendar", async () => {
      const leaveReq = makeLeaveRequest();
      const deps = makeDeps({
        leaveRequestRepo: {
          findById: vi.fn().mockResolvedValue(leaveReq),
          updateCalendarEventIds: vi.fn().mockResolvedValue(undefined),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: leaveReq.employeeId.toString(),
        leaveRequestId: leaveReq._id.toString(),
        service: "google_calendar",
        action: "create",
      };

      await service.syncCalendar(jobData);

      expect(deps.googleSync.createEvent).toHaveBeenCalledOnce();
    });

    it("calls outlookSync.createEvent on create action for outlook_calendar", async () => {
      const leaveReq = makeLeaveRequest();
      const token = makeToken({ service: "outlook_calendar" });
      const deps = makeDeps({
        leaveRequestRepo: {
          findById: vi.fn().mockResolvedValue(leaveReq),
          updateCalendarEventIds: vi.fn().mockResolvedValue(undefined),
        },
        oauthTokenRepo: {
          findByEmployeeAndService: vi.fn().mockResolvedValue(token),
          updateToken: vi.fn(),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: leaveReq.employeeId.toString(),
        leaveRequestId: leaveReq._id.toString(),
        service: "outlook_calendar",
        action: "create",
      };

      await service.syncCalendar(jobData);

      expect(deps.outlookSync.createEvent).toHaveBeenCalledOnce();
    });

    it("stores the returned calendar event ID after create", async () => {
      const leaveReq = makeLeaveRequest();
      const deps = makeDeps({
        leaveRequestRepo: {
          findById: vi.fn().mockResolvedValue(leaveReq),
          updateCalendarEventIds: vi.fn().mockResolvedValue(undefined),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: leaveReq.employeeId.toString(),
        leaveRequestId: leaveReq._id.toString(),
        service: "google_calendar",
        action: "create",
      };

      await service.syncCalendar(jobData);

      expect(deps.leaveRequestRepo.updateCalendarEventIds).toHaveBeenCalledWith(
        "tenant-a",
        leaveReq._id,
        expect.objectContaining({ google: "google-event-id-123" })
      );
    });

    it("calls googleSync.deleteEvent on delete action with existing event ID", async () => {
      const leaveReq = makeLeaveRequest({
        calendarEventIds: { google: "existing-event-id", outlook: null },
      });
      const deps = makeDeps({
        leaveRequestRepo: {
          findById: vi.fn().mockResolvedValue(leaveReq),
          updateCalendarEventIds: vi.fn().mockResolvedValue(undefined),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: leaveReq.employeeId.toString(),
        leaveRequestId: leaveReq._id.toString(),
        service: "google_calendar",
        action: "delete",
      };

      await service.syncCalendar(jobData);

      expect(deps.googleSync.deleteEvent).toHaveBeenCalledWith(
        expect.any(String),
        "existing-event-id"
      );
    });

    it("skips delete when no event ID exists", async () => {
      const leaveReq = makeLeaveRequest({
        calendarEventIds: { google: null, outlook: null },
      });
      const deps = makeDeps({
        leaveRequestRepo: {
          findById: vi.fn().mockResolvedValue(leaveReq),
          updateCalendarEventIds: vi.fn(),
        },
      });
      const service = createCalendarSyncService(deps);

      const jobData: CalendarSyncJobData = {
        tenantId: "tenant-a",
        employeeId: leaveReq.employeeId.toString(),
        leaveRequestId: leaveReq._id.toString(),
        service: "google_calendar",
        action: "delete",
      };

      await service.syncCalendar(jobData);

      expect(deps.googleSync.deleteEvent).not.toHaveBeenCalled();
    });
  });
});

// ----------------------------------------------------------------
// Google Calendar adapter tests
// ----------------------------------------------------------------

describe("GoogleCalendarSync", () => {
  function makeGoogleClient(): GoogleCalendarClient {
    return {
      events: {
        insert: vi.fn().mockResolvedValue({ data: { id: "google-evt-001" } }),
        delete: vi.fn().mockResolvedValue({}),
      },
    };
  }

  it("createEvent returns event ID from Google API", async () => {
    const client = makeGoogleClient();
    const sync = createGoogleCalendarSync({ client });

    const id = await sync.createEvent("access-token", {
      summary: "Annual Leave - Alice",
      startDate: "2025-04-01",
      endDate: "2025-04-05",
      description: "Vacation",
    });

    expect(id).toBe("google-evt-001");
    expect(client.events.insert).toHaveBeenCalledOnce();
  });

  it("deleteEvent calls Google API with correct event ID", async () => {
    const client = makeGoogleClient();
    const sync = createGoogleCalendarSync({ client });

    await sync.deleteEvent("access-token", "google-evt-001");

    expect(client.events.delete).toHaveBeenCalledWith(
      expect.objectContaining({ eventId: "google-evt-001" })
    );
  });

  it("throws when Google API returns no event ID", async () => {
    const client: GoogleCalendarClient = {
      events: {
        insert: vi.fn().mockResolvedValue({ data: { id: undefined } }),
        delete: vi.fn(),
      },
    };
    const sync = createGoogleCalendarSync({ client });

    await expect(
      sync.createEvent("token", {
        summary: "OOO",
        startDate: "2025-04-01",
        endDate: "2025-04-01",
        description: null,
      })
    ).rejects.toThrow();
  });
});

// ----------------------------------------------------------------
// Outlook Calendar adapter tests
// ----------------------------------------------------------------

describe("OutlookCalendarSync", () => {
  function makeOutlookClient(): OutlookCalendarClient {
    return {
      api: vi.fn().mockReturnValue({
        post: vi.fn().mockResolvedValue({ id: "outlook-evt-001" }),
        delete: vi.fn().mockResolvedValue(undefined),
      }),
    };
  }

  it("createEvent returns event ID from Graph API", async () => {
    const client = makeOutlookClient();
    const sync = createOutlookCalendarSync({ client });

    const id = await sync.createEvent("access-token", {
      summary: "Annual Leave - Alice",
      startDate: "2025-04-01",
      endDate: "2025-04-05",
      description: "Vacation",
    });

    expect(id).toBe("outlook-evt-001");
  });

  it("deleteEvent calls Graph API with correct event ID", async () => {
    const client = makeOutlookClient();
    const sync = createOutlookCalendarSync({ client });

    await sync.deleteEvent("access-token", "outlook-evt-001");

    expect(client.api).toHaveBeenCalledWith(
      expect.stringContaining("outlook-evt-001")
    );
  });
});
