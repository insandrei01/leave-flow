/**
 * Calendar module — swim-lane absences and coverage warnings.
 */

import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { calendarRoutes } from "./calendar.routes.js";

async function registerCalendarPlugin(app: FastifyInstance): Promise<void> {
  await app.register(calendarRoutes);
}

export const calendar = fp(registerCalendarPlugin, {
  name: "calendar-plugin",
  fastify: "5.x",
});

export { createCalendarService } from "./calendar.service.js";
export type {
  CalendarService,
  CalendarDeps,
  AbsencesResult,
  CoverageResult,
} from "./calendar.service.js";
