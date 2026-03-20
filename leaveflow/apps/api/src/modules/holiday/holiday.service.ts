/**
 * Holiday service — business logic for holiday management and working day calculation.
 *
 * Responsibilities:
 * - Get holidays for country + year
 * - Merge system holidays with tenant-custom holidays
 * - calculateWorkingDays: count working days between two dates,
 *   excluding weekends (per tenant work week config) and public/custom holidays
 */

import type { HolidayRepository } from "./holiday.repository.js";
import type {
  HolidayInput,
  HolidayRecord,
  HolidayCalendarRecord,
  WorkingDaysResult,
} from "./holiday.types.js";

// ----------------------------------------------------------------
// Dependency interfaces
// ----------------------------------------------------------------

export interface TenantSettingsProvider {
  getWorkWeek(tenantId: string): Promise<number[]>;
  getCountryCode(tenantId: string): Promise<string>;
}

// ----------------------------------------------------------------
// Service factory
// ----------------------------------------------------------------

export interface HolidayService {
  getHolidays(
    tenantId: string,
    countryCode: string,
    year: number
  ): Promise<HolidayRecord[]>;
  upsertCustomHolidays(
    tenantId: string,
    countryCode: string,
    year: number,
    holidays: HolidayInput[]
  ): Promise<HolidayCalendarRecord>;
  calculateWorkingDays(
    startDate: Date,
    endDate: Date,
    tenantId: string,
    options: {
      workWeek: number[];
      countryCode: string;
    }
  ): Promise<WorkingDaysResult>;
}

export function createHolidayService(deps: {
  repo: HolidayRepository;
}): HolidayService {
  const { repo } = deps;

  return {
    async getHolidays(
      tenantId: string,
      countryCode: string,
      year: number
    ): Promise<HolidayRecord[]> {
      if (!countryCode || countryCode.trim().length !== 2) {
        throw new Error("countryCode must be a 2-letter ISO code");
      }
      if (year < 2000 || year > 2100) {
        throw new Error("year must be between 2000 and 2100");
      }

      const [systemCalendar, tenantCalendar] = await Promise.all([
        repo.findByCountryYear(countryCode, year),
        repo.findTenantCustom(tenantId, countryCode, year),
      ]);

      const systemHolidays = systemCalendar?.holidays ?? [];
      const customHolidays = tenantCalendar?.holidays ?? [];

      // Merge: custom holidays override system holidays for the same date
      return mergeHolidays(systemHolidays, customHolidays);
    },

    async upsertCustomHolidays(
      tenantId: string,
      countryCode: string,
      year: number,
      holidays: HolidayInput[]
    ): Promise<HolidayCalendarRecord> {
      if (!tenantId) {
        throw new Error("tenantId is required");
      }
      if (!countryCode || countryCode.trim().length !== 2) {
        throw new Error("countryCode must be a 2-letter ISO code");
      }
      if (year < 2000 || year > 2100) {
        throw new Error("year must be between 2000 and 2100");
      }

      return repo.upsertCustomHolidays(tenantId, countryCode, year, holidays);
    },

    async calculateWorkingDays(
      startDate: Date,
      endDate: Date,
      tenantId: string,
      options: { workWeek: number[]; countryCode: string }
    ): Promise<WorkingDaysResult> {
      if (startDate > endDate) {
        throw new Error("startDate must not be after endDate");
      }

      const year = startDate.getFullYear();
      const endYear = endDate.getFullYear();

      // Collect holidays for all years in the range
      const holidaySet = new Map<string, string>(); // ISO date string -> holiday name

      for (let y = year; y <= endYear; y++) {
        const holidays = await getHolidaysForYear(
          repo,
          tenantId,
          options.countryCode,
          y
        );
        for (const h of holidays) {
          const key = toDateKey(h.date);
          holidaySet.set(key, h.name);
        }
      }

      const workWeekSet = new Set(options.workWeek);
      let workingDays = 0;
      const excludedDates: WorkingDaysResult["excludedDates"] = [];

      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        const dayOfWeek = current.getDay();
        const dateKey = toDateKey(current);

        if (!workWeekSet.has(dayOfWeek)) {
          excludedDates.push({ date: new Date(current), reason: "weekend" });
        } else if (holidaySet.has(dateKey)) {
          excludedDates.push({
            date: new Date(current),
            reason: "holiday",
            name: holidaySet.get(dateKey),
          });
        } else {
          workingDays++;
        }

        current.setDate(current.getDate() + 1);
      }

      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        workingDays,
        excludedDates,
      };
    },
  };
}

// ----------------------------------------------------------------
// Private helpers
// ----------------------------------------------------------------

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mergeHolidays(
  system: HolidayRecord[],
  custom: HolidayRecord[]
): HolidayRecord[] {
  const merged = new Map<string, HolidayRecord>();

  for (const h of system) {
    merged.set(toDateKey(h.date), h);
  }
  // Custom holidays override system for the same date
  for (const h of custom) {
    merged.set(toDateKey(h.date), h);
  }

  return Array.from(merged.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );
}

async function getHolidaysForYear(
  repo: HolidayRepository,
  tenantId: string,
  countryCode: string,
  year: number
): Promise<HolidayRecord[]> {
  const [systemCalendar, tenantCalendar] = await Promise.all([
    repo.findByCountryYear(countryCode, year),
    repo.findTenantCustom(tenantId, countryCode, year),
  ]);

  return mergeHolidays(
    systemCalendar?.holidays ?? [],
    tenantCalendar?.holidays ?? []
  );
}
