/**
 * Approval request template — data builder for approval cards.
 *
 * Validates required fields and returns a typed ApprovalRequestData
 * ready for rendering by platform-specific renderers.
 */

import type { ApprovalRequestData, ApprovalStep } from "../types.js";

export interface ApprovalRequestInput {
  readonly requestId: string;
  readonly employeeName: string;
  readonly employeeAvatarUrl?: string;
  readonly leaveTypeName: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDays: number;
  readonly reason?: string | null;
  readonly teamName: string;
  readonly balanceAfter: number;
  readonly balanceTotal: number;
  readonly teamCoverage: number;
  readonly othersOut?: readonly string[];
  readonly approvalChain: readonly ApprovalStep[];
  readonly submittedAt: string;
  readonly autoEscalateInHours?: number;
  readonly appBaseUrl: string;
}

/**
 * Builds an ApprovalRequestData object, applying defaults and validation.
 * Returns an immutable data object — never mutates input.
 */
export function buildApprovalRequestData(
  input: ApprovalRequestInput
): ApprovalRequestData {
  if (!input.requestId || input.requestId.trim().length === 0) {
    throw new Error("requestId is required for approval request template");
  }
  if (!input.employeeName || input.employeeName.trim().length === 0) {
    throw new Error("employeeName is required for approval request template");
  }
  if (input.workingDays <= 0) {
    throw new Error("workingDays must be positive for approval request template");
  }

  return Object.freeze({
    requestId: input.requestId,
    employeeName: input.employeeName,
    employeeAvatarUrl: input.employeeAvatarUrl,
    leaveTypeName: input.leaveTypeName,
    startDate: input.startDate,
    endDate: input.endDate,
    workingDays: input.workingDays,
    reason: input.reason ?? null,
    teamName: input.teamName,
    balanceAfter: input.balanceAfter,
    balanceTotal: input.balanceTotal,
    teamCoverage: input.teamCoverage,
    othersOut: Object.freeze([...(input.othersOut ?? [])]),
    approvalChain: Object.freeze([...input.approvalChain]),
    submittedAt: input.submittedAt,
    autoEscalateInHours: input.autoEscalateInHours,
    appBaseUrl: input.appBaseUrl,
  });
}
