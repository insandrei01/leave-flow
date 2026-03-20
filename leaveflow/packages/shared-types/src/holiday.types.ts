/**
 * Holiday calendar types — public holiday data and custom company holidays.
 * System-level calendars have tenantId: null; shared across all tenants.
 */

export type HolidayCalendarSource = 'system' | 'custom';

export interface Holiday {
  readonly date: string;
  readonly name: string;
  readonly localName: string | null;
  readonly isFixed: boolean;
  readonly isCustom: boolean;
}

export interface HolidayCalendar {
  readonly _id: string;
  /** null for shared system-level calendars (from Nager.Date API). */
  readonly tenantId: string | null;
  readonly countryCode: string;
  readonly year: number;
  readonly source: HolidayCalendarSource;
  readonly holidays: readonly Holiday[];
  readonly lastFetchedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
