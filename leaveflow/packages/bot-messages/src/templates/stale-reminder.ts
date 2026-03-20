/**
 * Stale reminder template — data builder.
 */

import type { StaleReminderData } from "../types.js";

export interface StaleReminderInput {
  readonly requestId: string;
  readonly employeeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly leaveTypeName: string;
  readonly workingDays: number;
  readonly waitingHours: number;
  readonly waitingSince: string;
  readonly reminderNumber: number;
  readonly totalReminders: number;
  readonly autoEscalateInHours?: number;
  readonly appBaseUrl: string;
}

/**
 * Builds a StaleReminderData object with validation.
 */
export function buildStaleReminderData(
  input: StaleReminderInput
): StaleReminderData {
  if (!input.requestId || input.requestId.trim().length === 0) {
    throw new Error("requestId is required for stale reminder template");
  }
  if (input.waitingHours < 0) {
    throw new Error("waitingHours must be non-negative for stale reminder template");
  }
  if (input.reminderNumber < 1 || input.reminderNumber > input.totalReminders) {
    throw new Error("reminderNumber must be between 1 and totalReminders");
  }

  return Object.freeze({
    requestId: input.requestId,
    employeeName: input.employeeName,
    startDate: input.startDate,
    endDate: input.endDate,
    leaveTypeName: input.leaveTypeName,
    workingDays: input.workingDays,
    waitingHours: input.waitingHours,
    waitingSince: input.waitingSince,
    reminderNumber: input.reminderNumber,
    totalReminders: input.totalReminders,
    autoEscalateInHours: input.autoEscalateInHours,
    appBaseUrl: input.appBaseUrl,
  });
}
