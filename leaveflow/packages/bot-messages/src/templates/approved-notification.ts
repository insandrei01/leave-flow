/**
 * Approved notification template — data builder.
 */

import type { ApprovedNotificationData, ApprovalStep } from "../types.js";

export interface ApprovedNotificationInput {
  readonly requestId: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly newBalance: number;
  readonly totalBalance: number;
  readonly approvalChain: readonly ApprovalStep[];
}

/**
 * Builds an ApprovedNotificationData object with validation.
 */
export function buildApprovedNotificationData(
  input: ApprovedNotificationInput
): ApprovedNotificationData {
  if (!input.requestId || input.requestId.trim().length === 0) {
    throw new Error("requestId is required for approved notification template");
  }
  if (input.workingDays <= 0) {
    throw new Error("workingDays must be positive for approved notification template");
  }

  return Object.freeze({
    requestId: input.requestId,
    leaveTypeName: input.leaveTypeName,
    startDate: input.startDate,
    endDate: input.endDate,
    workingDays: input.workingDays,
    newBalance: input.newBalance,
    totalBalance: input.totalBalance,
    approvalChain: Object.freeze([...input.approvalChain]),
  });
}
