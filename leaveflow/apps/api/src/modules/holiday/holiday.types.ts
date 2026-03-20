/**
 * Service-level types for the holiday module.
 */

export interface HolidayInput {
  date: Date;
  name: string;
  localName?: string | null;
  isFixed: boolean;
  isCustom?: boolean;
}

export interface HolidayRecord {
  date: Date;
  name: string;
  localName: string | null;
  isFixed: boolean;
  isCustom: boolean;
}

export interface HolidayCalendarRecord {
  id: string;
  tenantId: string | null;
  countryCode: string;
  year: number;
  source: "system" | "custom";
  holidays: HolidayRecord[];
  lastFetchedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkingDaysResult {
  startDate: Date;
  endDate: Date;
  workingDays: number;
  excludedDates: Array<{ date: Date; reason: "weekend" | "holiday"; name?: string }>;
}
