/**
 * Types for the calendar-sync module.
 *
 * Defines the OOO event payload and repository interfaces.
 */

import mongoose from "mongoose";

// ----------------------------------------------------------------
// OOO event creation payload (platform-agnostic)
// ----------------------------------------------------------------

export interface OooEventPayload {
  /** Event title, e.g. "Annual Leave - Alice Smith" */
  readonly summary: string;
  /** ISO date string, e.g. "2025-04-01" */
  readonly startDate: string;
  /** ISO date string (inclusive end), e.g. "2025-04-05" */
  readonly endDate: string;
  /** Optional leave reason */
  readonly description: string | null;
}

// ----------------------------------------------------------------
// Calendar sync adapter interface (platform-agnostic)
// ----------------------------------------------------------------

export interface ICalendarSyncAdapter {
  /**
   * Creates an OOO event on the calendar.
   * Returns the platform-specific event ID.
   */
  createEvent(accessToken: string, payload: OooEventPayload): Promise<string>;

  /**
   * Deletes an OOO event by platform event ID.
   */
  deleteEvent(accessToken: string, eventId: string): Promise<void>;
}

// ----------------------------------------------------------------
// Repository interfaces
// ----------------------------------------------------------------

export interface ILeaveRequestRepoDep {
  findById(
    tenantId: string,
    id: mongoose.Types.ObjectId
  ): Promise<ILeaveRequestDoc | null>;
  updateCalendarEventIds(
    tenantId: string,
    id: mongoose.Types.ObjectId,
    ids: { google?: string | null; outlook?: string | null }
  ): Promise<void>;
}

export interface ILeaveRequestDoc {
  _id: mongoose.Types.ObjectId;
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  workingDays: number;
  reason: string | null;
  status: string;
  calendarEventIds: { google?: string | null; outlook?: string | null };
}

export interface IOAuthTokenRepoDep {
  findByEmployeeAndService(
    tenantId: string,
    employeeId: mongoose.Types.ObjectId,
    service: string
  ): Promise<IOAuthTokenDoc | null>;
  updateToken(
    id: mongoose.Types.ObjectId,
    update: { encryptedAccessToken: string; tokenExpiresAt: Date }
  ): Promise<void>;
}

export interface IOAuthTokenDoc {
  _id: mongoose.Types.ObjectId;
  encryptedAccessToken: string;
  encryptedRefreshToken: string;
  tokenExpiresAt: Date;
  isActive: boolean;
}
