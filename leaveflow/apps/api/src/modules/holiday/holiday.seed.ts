/**
 * Holiday data seed script.
 *
 * Fetches public holidays from the Nager.Date API for 50 countries
 * across years 2026–2027 and persists them as system holiday calendars.
 *
 * Falls back to bundled fallback.json if the API is unavailable.
 *
 * Usage:
 *   npx tsx src/modules/holiday/holiday.seed.ts
 *   MONGODB_URI=... npx tsx src/modules/holiday/holiday.seed.ts
 */

import { createRequire } from "module";
import { HolidayCalendarModel } from "../../models/index.js";
import { connectDatabase, disconnectDatabase } from "../../lib/db.js";

const require = createRequire(import.meta.url);

// ----------------------------------------------------------------
// Country list (50 ISO 3166-1 alpha-2 codes supported by Nager.Date)
// ----------------------------------------------------------------

const SEED_COUNTRIES: readonly string[] = [
  "AD", "AL", "AR", "AT", "AU",
  "BA", "BE", "BG", "BR", "BY",
  "CA", "CH", "CL", "CN", "CO",
  "CZ", "DE", "DK", "EE", "ES",
  "FI", "FR", "GB", "GR", "HR",
  "HU", "ID", "IE", "IL", "IN",
  "IS", "IT", "JP", "KR", "LI",
  "LT", "LU", "LV", "MX", "MY",
  "NL", "NO", "NZ", "PE", "PL",
  "PT", "RO", "RS", "RU", "SE",
] as const;

const SEED_YEARS: readonly number[] = [2026, 2027] as const;

const NAGER_BASE_URL = "https://date.nager.at/api/v3";

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface NagerHoliday {
  date: string;
  localName: string;
  name: string;
  fixed: boolean;
}

interface SeedResult {
  country: string;
  year: number;
  count: number;
  source: "api" | "fallback" | "error";
  error?: string;
}

// ----------------------------------------------------------------
// Nager.Date API fetch (with timeout)
// ----------------------------------------------------------------

async function fetchHolidaysFromApi(
  countryCode: string,
  year: number
): Promise<NagerHoliday[]> {
  const url = `${NAGER_BASE_URL}/PublicHolidays/${year}/${countryCode}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as NagerHoliday[];
  } finally {
    clearTimeout(timeoutId);
  }
}

// ----------------------------------------------------------------
// Fallback data loader
// ----------------------------------------------------------------

interface FallbackData {
  countries: Record<
    string,
    { name: string; holidays: Array<{ date: string; name: string; year: number }> }
  >;
}

function loadFallbackData(): FallbackData {
  const data = require("./holiday-data/fallback.json") as FallbackData;
  return data;
}

function getFallbackHolidays(
  countryCode: string,
  year: number,
  fallback: FallbackData
): NagerHoliday[] | null {
  const countryData = fallback.countries[countryCode];
  if (countryData === undefined) return null;

  const holidays = countryData.holidays.filter((h) => h.year === year);
  return holidays.map((h) => ({
    date: h.date,
    localName: h.name,
    name: h.name,
    fixed: true,
  }));
}

// ----------------------------------------------------------------
// Upsert one calendar
// ----------------------------------------------------------------

async function upsertCalendar(
  countryCode: string,
  year: number,
  holidays: NagerHoliday[]
): Promise<void> {
  const holidayDocs = holidays.map((h) => ({
    date: new Date(h.date),
    name: h.name,
    localName: h.localName ?? null,
    isFixed: h.fixed,
    isCustom: false,
  }));

  await HolidayCalendarModel.findOneAndUpdate(
    { countryCode, year, tenantId: null, source: "system" },
    {
      $set: {
        holidays: holidayDocs,
        lastFetchedAt: new Date(),
      },
      $setOnInsert: {
        countryCode,
        year,
        tenantId: null,
        source: "system",
      },
    },
    { upsert: true, new: true }
  );
}

// ----------------------------------------------------------------
// Main seed function
// ----------------------------------------------------------------

async function seedHolidays(): Promise<void> {
  console.log("Connecting to database...");
  await connectDatabase();

  const fallback = loadFallbackData();
  const results: SeedResult[] = [];
  let apiUnavailable = false;

  for (const countryCode of SEED_COUNTRIES) {
    for (const year of SEED_YEARS) {
      let holidays: NagerHoliday[] | null = null;
      let source: SeedResult["source"] = "api";

      if (!apiUnavailable) {
        try {
          holidays = await fetchHolidaysFromApi(countryCode, year);
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          if (errorMsg.includes("abort") || errorMsg.includes("ENOTFOUND")) {
            apiUnavailable = true;
            console.warn("Nager.Date API unavailable — switching to fallback data");
          }
        }
      }

      if (holidays === null) {
        const fallbackHolidays = getFallbackHolidays(countryCode, year, fallback);
        if (fallbackHolidays !== null) {
          holidays = fallbackHolidays;
          source = "fallback";
        } else {
          results.push({
            country: countryCode,
            year,
            count: 0,
            source: "error",
            error: "No API data and no fallback available",
          });
          continue;
        }
      }

      try {
        await upsertCalendar(countryCode, year, holidays);
        results.push({ country: countryCode, year, count: holidays.length, source });
        process.stdout.write(`  [OK] ${countryCode} ${year} — ${holidays.length} holidays (${source})\n`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.push({ country: countryCode, year, count: 0, source: "error", error: errorMsg });
        console.error(`  [ERR] ${countryCode} ${year} — ${errorMsg}`);
      }
    }
  }

  const total = results.reduce((sum, r) => sum + r.count, 0);
  const errors = results.filter((r) => r.source === "error").length;
  const fromApi = results.filter((r) => r.source === "api").length;
  const fromFallback = results.filter((r) => r.source === "fallback").length;

  console.log("\n--- Seed Summary ---");
  console.log(`Total calendars: ${results.length}`);
  console.log(`From API: ${fromApi}`);
  console.log(`From fallback: ${fromFallback}`);
  console.log(`Errors: ${errors}`);
  console.log(`Total holidays stored: ${total}`);

  await disconnectDatabase();
  process.exit(errors > 0 ? 1 : 0);
}

// Run when executed directly
seedHolidays().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
