import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { holidayRoutes } from "./holiday.routes.js";

async function registerHolidayPlugin(app: FastifyInstance): Promise<void> {
  await app.register(holidayRoutes);
}

export const holidays = fp(registerHolidayPlugin, {
  name: "holiday-plugin",
  fastify: "5.x",
});

export { createHolidayRepository } from "./holiday.repository.js";
export type { HolidayRepository } from "./holiday.repository.js";
export { createHolidayService } from "./holiday.service.js";
export type {
  HolidayService,
  TenantSettingsProvider,
} from "./holiday.service.js";
export type {
  HolidayInput,
  HolidayRecord,
  HolidayCalendarRecord,
  WorkingDaysResult,
} from "./holiday.types.js";
