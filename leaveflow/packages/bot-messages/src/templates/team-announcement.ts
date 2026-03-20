/**
 * Team announcement template — data builder.
 *
 * Deliberately minimal to respect privacy rule BR-092:
 * leave type is NOT included in team channel announcements.
 */

import type { TeamAnnouncementData } from "../types.js";

export interface TeamAnnouncementInput {
  readonly employeeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
}

/**
 * Builds a TeamAnnouncementData object with validation.
 */
export function buildTeamAnnouncementData(
  input: TeamAnnouncementInput
): TeamAnnouncementData {
  if (!input.employeeName || input.employeeName.trim().length === 0) {
    throw new Error("employeeName is required for team announcement template");
  }
  if (input.workingDays <= 0) {
    throw new Error("workingDays must be positive for team announcement template");
  }

  return Object.freeze({
    employeeName: input.employeeName,
    startDate: input.startDate,
    endDate: input.endDate,
    workingDays: input.workingDays,
  });
}
