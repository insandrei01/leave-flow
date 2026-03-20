/**
 * HolidayCalendar model — public holiday data and custom company holidays.
 *
 * System-level calendars (from Nager.Date API) have tenantId: null.
 * Tenant-specific custom holidays have tenantId set.
 *
 * NOTE: The requireTenantIdPlugin is NOT applied here because system-level
 * data legitimately has tenantId: null. Queries use { tenantId: null } or
 * { tenantId: '<id>' } explicitly.
 */

import mongoose, { Schema, type Document } from "mongoose";

// ----------------------------------------------------------------
// Sub-document interfaces
// ----------------------------------------------------------------

export interface Holiday {
  date: Date;
  name: string;
  localName: string | null;
  isFixed: boolean;
  isCustom: boolean;
}

// ----------------------------------------------------------------
// Document interface
// ----------------------------------------------------------------

export interface IHolidayCalendar extends Document {
  tenantId: string | null;
  countryCode: string;
  year: number;
  source: "system" | "custom";
  holidays: Holiday[];
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------------------------------
// Schema
// ----------------------------------------------------------------

const HolidaySchema = new Schema<Holiday>(
  {
    date: { type: Date, required: true },
    name: { type: String, required: true },
    localName: { type: String, default: null },
    isFixed: { type: Boolean, required: true },
    isCustom: { type: Boolean, default: false },
  },
  { _id: false }
);

const HolidayCalendarSchema = new Schema<IHolidayCalendar>(
  {
    tenantId: { type: String, default: null },
    countryCode: { type: String, required: true, uppercase: true, maxlength: 2 },
    year: { type: Number, required: true },
    source: {
      type: String,
      enum: ["system", "custom"],
      required: true,
    },
    holidays: { type: [HolidaySchema], default: [] },
    lastFetchedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "holiday_calendars",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------------------
// Indexes
// ----------------------------------------------------------------

// country_year — holiday lookup for working day calculation
// System calendars have tenantId=null (included in the unique key)
HolidayCalendarSchema.index(
  { tenantId: 1, countryCode: 1, year: 1 },
  { unique: true, name: "country_year" }
);

// NOTE: requireTenantIdPlugin is NOT applied — system data has tenantId: null

// ----------------------------------------------------------------
// Model
// ----------------------------------------------------------------

export const HolidayCalendarModel =
  (mongoose.models["HolidayCalendar"] as
    | mongoose.Model<IHolidayCalendar>
    | undefined) ??
  mongoose.model<IHolidayCalendar>("HolidayCalendar", HolidayCalendarSchema);
