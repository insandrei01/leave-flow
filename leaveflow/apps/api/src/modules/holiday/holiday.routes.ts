/**
 * Holiday routes.
 *
 * GET    /holidays             — list holidays for year/country (all roles)
 * POST   /holidays/custom      — add custom holiday (hr_admin+)
 * DELETE /holidays/custom/:date — remove custom holiday (hr_admin+)
 */

import type { FastifyInstance } from "fastify";
import { createHolidayRepository } from "./holiday.repository.js";
import { createHolidayService } from "./holiday.service.js";
import { TenantModel } from "../../models/index.js";
import {
  HolidaysQuerySchema,
  AddCustomHolidayBodySchema,
  DeleteCustomHolidayParamsSchema,
} from "./holiday.schema.js";
import { sendSuccess, sendCreated } from "../../lib/response.js";
import { ForbiddenError, ValidationError, NotFoundError } from "../../lib/errors.js";

const WRITE_ROLES = new Set(["hr_admin", "company_admin"]);

export async function holidayRoutes(app: FastifyInstance): Promise<void> {
  const repo = createHolidayRepository();
  const service = createHolidayService({ repo });

  /**
   * GET /holidays
   * Returns public + custom holidays for a year.
   * Auth: all roles
   */
  app.get("/holidays", async (request, reply) => {
    const parsed = HolidaysQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      throw new ValidationError("Invalid query parameters", parsed.error.issues);
    }

    const { year } = parsed.data;
    const tenantId = request.tenantId ?? "";

    // Resolve country code: query param overrides tenant default
    let countryCode = parsed.data.countryCode;
    if (countryCode === undefined) {
      const tenant = await TenantModel.findOne({ _id: tenantId })
        .select("settings.countryCode")
        .lean<{ settings?: { countryCode?: string } }>();
      countryCode = tenant?.settings?.countryCode ?? "GB";
    }

    const holidays = await service.getHolidays(tenantId, countryCode, year);

    return sendSuccess(reply, {
      countryCode,
      year,
      holidays: holidays.map((h) => ({
        date: toDateString(h.date),
        name: h.name,
        type: h.isCustom ? "custom" : "public",
      })),
    });
  });

  /**
   * POST /holidays/custom
   * Add a company-specific custom holiday.
   * Auth: hr_admin, company_admin
   */
  app.post("/holidays/custom", async (request, reply) => {
    const role = request.auth?.role ?? "";
    if (!WRITE_ROLES.has(role)) {
      throw new ForbiddenError("Only hr_admin or company_admin can add custom holidays");
    }

    const parsed = AddCustomHolidayBodySchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError("Invalid request body", parsed.error.issues);
    }

    const { date, name, year } = parsed.data;
    const tenantId = request.tenantId ?? "";

    // Resolve country code
    let countryCode = parsed.data.countryCode;
    if (countryCode === undefined) {
      const tenant = await TenantModel.findOne({ _id: tenantId })
        .select("settings.countryCode")
        .lean<{ settings?: { countryCode?: string } }>();
      countryCode = tenant?.settings?.countryCode ?? "GB";
    }

    // Get existing custom holidays and append
    const existing = await service.getHolidays(tenantId, countryCode, year);
    const existingCustom = existing.filter((h) => h.isCustom);

    const newHoliday = {
      date: new Date(date),
      name,
      isFixed: true,
      isCustom: true,
    };

    // Check if date already exists
    const alreadyExists = existingCustom.some(
      (h) => toDateString(h.date) === date
    );
    if (alreadyExists) {
      throw new ValidationError(`A custom holiday already exists for ${date}`);
    }

    await service.upsertCustomHolidays(tenantId, countryCode, year, [
      ...existingCustom.map((h) => ({
        date: h.date,
        name: h.name,
        isFixed: h.isFixed,
        isCustom: true,
      })),
      newHoliday,
    ]);

    return sendCreated(reply, {
      date,
      name,
      type: "custom",
    });
  });

  /**
   * DELETE /holidays/custom/:date
   * Remove a custom holiday by date.
   * Auth: hr_admin, company_admin
   */
  app.delete("/holidays/custom/:date", async (request, reply) => {
    const role = request.auth?.role ?? "";
    if (!WRITE_ROLES.has(role)) {
      throw new ForbiddenError("Only hr_admin or company_admin can remove custom holidays");
    }

    const parsed = DeleteCustomHolidayParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      throw new ValidationError("Invalid params", parsed.error.issues);
    }

    const { date } = parsed.data;
    const tenantId = request.tenantId ?? "";
    const year = new Date(date).getFullYear();

    // Resolve country code from tenant
    const tenant = await TenantModel.findOne({ _id: tenantId })
      .select("settings.countryCode")
      .lean<{ settings?: { countryCode?: string } }>();
    const countryCode = tenant?.settings?.countryCode ?? "GB";

    const existing = await service.getHolidays(tenantId, countryCode, year);
    const customHolidays = existing.filter((h) => h.isCustom);

    const toDelete = customHolidays.find((h) => toDateString(h.date) === date);
    if (toDelete === undefined) {
      throw new NotFoundError("Custom holiday", date);
    }

    const remaining = customHolidays.filter((h) => toDateString(h.date) !== date);

    await service.upsertCustomHolidays(
      tenantId,
      countryCode,
      year,
      remaining.map((h) => ({
        date: h.date,
        name: h.name,
        isFixed: h.isFixed,
        isCustom: true,
      }))
    );

    return sendSuccess(reply, { date, deleted: true });
  });
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
