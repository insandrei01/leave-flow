/**
 * Rejected notification template — data builder.
 */

import type { RejectedNotificationData, ApprovalStep } from "../types.js";

export interface RejectedNotificationInput {
  readonly requestId: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly rejectedByName: string;
  readonly rejectedByRole: string;
  readonly rejectionReason: string;
  readonly approvalChain: readonly ApprovalStep[];
  readonly appBaseUrl: string;
}

/**
 * Builds a RejectedNotificationData object with validation.
 */
export function buildRejectedNotificationData(
  input: RejectedNotificationInput
): RejectedNotificationData {
  if (!input.requestId || input.requestId.trim().length === 0) {
    throw new Error("requestId is required for rejected notification template");
  }
  if (!input.rejectionReason || input.rejectionReason.trim().length === 0) {
    throw new Error("rejectionReason is required for rejected notification template");
  }

  return Object.freeze({
    requestId: input.requestId,
    leaveTypeName: input.leaveTypeName,
    startDate: input.startDate,
    endDate: input.endDate,
    rejectedByName: input.rejectedByName,
    rejectedByRole: input.rejectedByRole,
    rejectionReason: input.rejectionReason,
    approvalChain: Object.freeze([...input.approvalChain]),
    appBaseUrl: input.appBaseUrl,
  });
}
