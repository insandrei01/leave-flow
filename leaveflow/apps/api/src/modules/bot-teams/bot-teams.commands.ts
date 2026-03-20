/**
 * Teams bot command handlers.
 *
 * Handles text messages: "/leave", "/leave balance", "/leave status [requestId]"
 * and the Teams command extensions.
 */

import mongoose from "mongoose";
import type { TeamsBotAdapter } from "./bot-teams.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { BalanceService } from "../balance/balance.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";
import {
  renderBalanceCheck,
} from "../../../../../packages/bot-messages/src/teams/adaptive-card.renderer.js";

// ----------------------------------------------------------------
// Teams command payload type
// ----------------------------------------------------------------

export interface TeamsCommandPayload {
  readonly text: string;
  readonly platformUserId: string;
  readonly conversationId: string;
  readonly serviceUrl: string;
  readonly teamsTenantId?: string;
}

// ----------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------

export interface TeamsCommandsDeps {
  readonly adapter: TeamsBotAdapter;
  readonly mappingService: BotMappingService;
  readonly balanceService: BalanceService;
  readonly leaveRequestService: LeaveRequestService;
  readonly leaveTypes: ReadonlyArray<{ id: string; name: string }>;
}

// ----------------------------------------------------------------
// Main command dispatcher
// ----------------------------------------------------------------

/**
 * Dispatches a Teams text command to the appropriate handler.
 * Recognized commands: "/leave", "/leave balance", "/leave status [requestId]"
 */
export async function handleLeaveCommand(
  payload: TeamsCommandPayload,
  deps: TeamsCommandsDeps
): Promise<void> {
  const text = payload.text.trim().toLowerCase();

  if (text === "/leave" || text === "leave") {
    await openLeaveForm(payload, deps);
    return;
  }

  if (text === "/leave balance" || text === "balance") {
    await handleBalance(payload, deps);
    return;
  }

  if (text.startsWith("/leave status") || text.startsWith("status")) {
    await handleStatus(payload, text, deps);
    return;
  }

  // Default: open leave form
  await openLeaveForm(payload, deps);
}

// ----------------------------------------------------------------
// /leave — open leave request form card
// ----------------------------------------------------------------

async function openLeaveForm(
  payload: TeamsCommandPayload,
  deps: TeamsCommandsDeps
): Promise<void> {
  await deps.adapter.sendLeaveRequestForm({
    platformUserId: payload.platformUserId,
    leaveTypes: deps.leaveTypes,
  });
}

// ----------------------------------------------------------------
// /leave balance
// ----------------------------------------------------------------

async function handleBalance(
  payload: TeamsCommandPayload,
  deps: TeamsCommandsDeps
): Promise<void> {
  const resolved = await deps.mappingService.resolveUser("teams", payload.platformUserId);

  if (resolved === null) {
    await deps.adapter.sendDirectMessage(payload.platformUserId, {
      text: "Your Teams account is not connected to LeaveFlow. Please contact your HR administrator.",
    });
    return;
  }

  const employeeId = new mongoose.Types.ObjectId(resolved.employeeId);
  const balances = await deps.balanceService.getEmployeeBalances(
    resolved.tenantId,
    employeeId
  );

  const currentYear = new Date().getFullYear();
  // BalanceSummary contains leaveTypeId + balance (computed from ledger SUM).
  // Cast to any to support both real BalanceSummary and mock test shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const balanceEntries = (balances as any[]).map((b) => ({
    leaveTypeName: (b.leaveTypeName as string | undefined) ?? b.leaveTypeId?.toString() ?? "Unknown",
    used: (b.used as number | undefined) ?? 0,
    total: (b.allocated as number | undefined) ?? (b.balance as number | undefined) ?? 0,
  }));

  const card = renderBalanceCheck({
    employeeName: resolved.employeeId,
    balances: balanceEntries,
    fiscalYear: currentYear,
  });

  await deps.adapter.sendDirectMessage(payload.platformUserId, {
    text: "Your leave balances",
    data: { card },
  });
}

// ----------------------------------------------------------------
// /leave status [requestId]
// ----------------------------------------------------------------

async function handleStatus(
  payload: TeamsCommandPayload,
  text: string,
  deps: TeamsCommandsDeps
): Promise<void> {
  // Extract request ID from "/leave status <id>" or "status <id>"
  const parts = text.split(/\s+/);
  // "/leave status <id>" → parts: ["/leave", "status", "<id>"] → requestId = parts[2]
  // "status <id>"        → parts: ["status", "<id>"]           → requestId = parts[1]
  // "/leave status"      → parts: ["/leave", "status"]         → no requestId (show usage)
  // "status"             → parts: ["status"]                   → no requestId (show usage)
  const statusIdx = parts.findIndex((p) => p === "status");
  const requestId = statusIdx >= 0 ? parts[statusIdx + 1] : undefined;

  if (requestId === undefined || requestId === "") {
    await deps.adapter.sendDirectMessage(payload.platformUserId, {
      text: "Usage: `/leave status <requestId>` — provide a request ID to look up.",
    });
    return;
  }

  const resolved = await deps.mappingService.resolveUser("teams", payload.platformUserId);

  if (resolved === null) {
    await deps.adapter.sendDirectMessage(payload.platformUserId, {
      text: "Your Teams account is not connected to LeaveFlow.",
    });
    return;
  }

  let leaveRequest: Awaited<ReturnType<LeaveRequestService["findById"]>>;
  try {
    leaveRequest = await deps.leaveRequestService.findById(
      resolved.tenantId,
      new mongoose.Types.ObjectId(requestId)
    );
  } catch {
    await deps.adapter.sendDirectMessage(payload.platformUserId, {
      text: `Invalid request ID: \`${requestId}\``,
    });
    return;
  }

  if (leaveRequest === null) {
    await deps.adapter.sendDirectMessage(payload.platformUserId, {
      text: `Leave request \`${requestId}\` not found.`,
    });
    return;
  }

  const historyLines = leaveRequest.approvalHistory
    .map(
      (h) =>
        `• Step ${h.step + 1}: ${h.action} by ${h.actorName} — ${h.timestamp.toISOString()}`
    )
    .join("\n");

  await deps.adapter.sendDirectMessage(payload.platformUserId, {
    text: [
      `**Leave Request** \`${requestId}\``,
      `Status: **${leaveRequest.status}**`,
      `Dates: ${leaveRequest.startDate.toDateString()} – ${leaveRequest.endDate.toDateString()}`,
      `Working Days: ${leaveRequest.workingDays}`,
      historyLines.length > 0 ? `\n**Approval Journey:**\n${historyLines}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
