/**
 * Holiday repository — data access layer for the holiday_calendars collection.
 *
 * System calendars have tenantId: null.
 * Tenant-specific calendars have tenantId set.
 *
 * NOTE: requireTenantIdPlugin is NOT applied to HolidayCalendarModel,
 * so queries without tenantId are valid for system data.
 */

import { HolidayCalendarModel } from "../../models/index.js";
import type { HolidayInput, HolidayCalendarRecord, HolidayRecord } from "./holiday.types.js";

// ----------------------------------------------------------------
// Type helpers
// ----------------------------------------------------------------

type LeanHolidayCalendar = {
  _id: unknown;
  tenantId: string | null;
  countryCode: string;
  year: number;
  source: "system" | "custom";
  holidays: Array<{
    date: Date;
    name: string;
    localName: string | null;
    isFixed: boolean;
    isCustom: boolean;
  }>;
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toHolidayRecord(raw: {
  date: Date;
  name: string;
  localName: string | null;
  isFixed: boolean;
  isCustom: boolean;
}): HolidayRecord {
  return {
    date: raw.date,
    name: raw.name,
    localName: raw.localName,
    isFixed: raw.isFixed,
    isCustom: raw.isCustom,
  };
}

function toRecord(raw: LeanHolidayCalendar): HolidayCalendarRecord {
  return {
    id: String(raw._id),
    tenantId: raw.tenantId,
    countryCode: raw.countryCode,
    year: raw.year,
    source: raw.source,
    holidays: raw.holidays.map(toHolidayRecord),
    lastFetchedAt: raw.lastFetchedAt,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

// ----------------------------------------------------------------
// Repository factory
// ----------------------------------------------------------------

export interface HolidayRepository {
  findByCountryYear(
    countryCode: string,
    year: number
  ): Promise<HolidayCalendarRecord | null>;
  findTenantCustom(
    tenantId: string,
    countryCode: string,
    year: number
  ): Promise<HolidayCalendarRecord | null>;
  upsertCustomHolidays(
    tenantId: string,
    countryCode: string,
    year: number,
    holidays: HolidayInput[]
  ): Promise<HolidayCalendarRecord>;
}

export function createHolidayRepository(): HolidayRepository {
  return {
    async findByCountryYear(
      countryCode: string,
      year: number
    ): Promise<HolidayCalendarRecord | null> {
      const raw = await HolidayCalendarModel.findOne({
        tenantId: null,
        countryCode: countryCode.toUpperCase(),
        year,
        source: "system",
      })
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanHolidayCalendar);
    },

    async findTenantCustom(
      tenantId: string,
      countryCode: string,
      year: number
    ): Promise<HolidayCalendarRecord | null> {
      const raw = await HolidayCalendarModel.findOne({
        tenantId,
        countryCode: countryCode.toUpperCase(),
        year,
        source: "custom",
      })
        .lean()
        .exec();

      if (raw === null || raw === undefined) return null;
      return toRecord(raw as unknown as LeanHolidayCalendar);
    },

    async upsertCustomHolidays(
      tenantId: string,
      countryCode: string,
      year: number,
      holidays: HolidayInput[]
    ): Promise<HolidayCalendarRecord> {
      const holidayDocs = holidays.map((h) => ({
        date: h.date,
        name: h.name,
        localName: h.localName ?? null,
        isFixed: h.isFixed,
        isCustom: true,
      }));

      const raw = await HolidayCalendarModel.findOneAndUpdate(
        { tenantId, countryCode: countryCode.toUpperCase(), year },
        {
          $set: {
            source: "custom",
            holidays: holidayDocs,
          },
        },
        { upsert: true, new: true, runValidators: true }
      )
        .lean()
        .exec();

      return toRecord(raw as unknown as LeanHolidayCalendar);
    },
  };
}
