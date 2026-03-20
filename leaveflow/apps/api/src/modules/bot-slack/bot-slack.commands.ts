/**
 * Slack slash command handlers.
 *
 * Handles: /leave, /leave balance, /leave status [requestId]
 *
 * Each handler receives a Slack command payload, resolves the user,
 * and delegates to domain services for data.
 */

import type { SlackBotAdapter } from "./bot-slack.adapter.js";
import type { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import type { BalanceService } from "../balance/balance.service.js";
import type { LeaveRequestService } from "../leave-request/leave-request.service.js";
import mongoose from "mongoose";
import {
  renderBalanceCheck,
} from "../../../../../packages/bot-messages/src/slack/block-kit.renderer.js";

// ----------------------------------------------------------------
// Slack command context types (platform-agnostic wrapper)
// ----------------------------------------------------------------

export interface SlackCommandPayload {
  readonly command: string;
  readonly text: string;
  readonly user_id: string;
  readonly channel_id: string;
  readonly trigger_id: string;
  readonly team_id: string;
}

export interface SlackCommandResponder {
  respond(options: { text?: string; blocks?: unknown[]; response_type?: string }): Promise<void>;
}

// ----------------------------------------------------------------
// Dependencies
// ----------------------------------------------------------------

export interface SlackCommandsDeps {
  readonly adapter: SlackBotAdapter;
  readonly mappingService: BotMappingService;
  readonly balanceService: BalanceService;
  readonly leaveRequestService: LeaveRequestService;
  readonly leaveTypes: ReadonlyArray<{ id: string; name: string }>;
}

// ----------------------------------------------------------------
// Command: /leave
// ----------------------------------------------------------------

/**
 * Opens the leave request modal for the triggering user.
 */
export async function handleLeaveCommand(
  payload: SlackCommandPayload,
  deps: SlackCommandsDeps
): Promise<void> {
  const subCommand = payload.text.trim().toLowerCase();

  if (subCommand === "balance") {
    await handleBalanceSubCommand(payload, deps);
    return;
  }

  if (subCommand.startsWith("status")) {
    await handleStatusSubCommand(payload, subCommand, deps);
    return;
  }

  // Default: open leave request modal
  await deps.adapter.sendLeaveRequestForm({
    platformUserId: payload.user_id,
    triggerId: payload.trigger_id,
    leaveTypes: deps.leaveTypes,
  });
}

// ----------------------------------------------------------------
// Sub-command: /leave balance
// ----------------------------------------------------------------

async function handleBalanceSubCommand(
  payload: SlackCommandPayload,
  deps: SlackCommandsDeps
): Promise<void> {
  const resolved = await deps.mappingService.resolveUser("slack", payload.user_id);

  if (resolved === null) {
    await deps.adapter.sendDirectMessage(payload.user_id, {
      text: "Your Slack account is not connected to LeaveFlow. Please contact your HR administrator.",
    });
    return;
  }

  const employeeId = new mongoose.Types.ObjectId(resolved.employeeId);
  const balances = await deps.balanceService.getEmployeeBalances(
    resolved.tenantId,
    employeeId
  );

  const currentYear = new Date().getFullYear();
  type BalanceRow = { leaveTypeName?: string; leaveTypeId?: { toString(): string }; used?: number; allocated?: number; balance?: number };
  const balanceEntries = (balances as BalanceRow[]).map((b) => ({
    leaveTypeName: b.leaveTypeName ?? b.leaveTypeId?.toString() ?? "",
    used: b.used ?? 0,
    total: b.allocated ?? b.balance ?? 0,
  }));

  const message = renderBalanceCheck({
    employeeName: payload.user_id,
    balances: balanceEntries,
    fiscalYear: currentYear,
  });

  await deps.adapter.postToChannel(
    { platform: "slack", channelId: payload.channel_id },
    {
      text: "Your leave balances",
      data: { blocks: message.blocks },
    }
  );
}

// ----------------------------------------------------------------
// Sub-command: /leave status [requestId]
// ----------------------------------------------------------------

async function handleStatusSubCommand(
  payload: SlackCommandPayload,
  subCommand: string,
  deps: SlackCommandsDeps
): Promise<void> {
  const parts = subCommand.split(/\s+/);
  const requestId = parts[1];

  if (requestId === undefined || requestId === "") {
    await deps.adapter.sendDirectMessage(payload.user_id, {
      text: "Usage: `/leave status <requestId>` — provide a request ID to look up.",
    });
    return;
  }

  const resolved = await deps.mappingService.resolveUser("slack", payload.user_id);

  if (resolved === null) {
    await deps.adapter.sendDirectMessage(payload.user_id, {
      text: "Your Slack account is not connected to LeaveFlow.",
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
    await deps.adapter.sendDirectMessage(payload.user_id, {
      text: `Invalid request ID: \`${requestId}\``,
    });
    return;
  }

  if (leaveRequest === null) {
    await deps.adapter.sendDirectMessage(payload.user_id, {
      text: `Leave request \`${requestId}\` not found.`,
    });
    return;
  }

  const historyLines = leaveRequest.approvalHistory
    .map((h) => `• Step ${h.step + 1}: ${h.action} by ${h.actorName} — ${h.timestamp.toISOString()}`)
    .join("\n");

  await deps.adapter.sendDirectMessage(payload.user_id, {
    text: [
      `*Leave Request* \`${requestId}\``,
      `Status: *${leaveRequest.status}*`,
      `Dates: ${leaveRequest.startDate.toDateString()} – ${leaveRequest.endDate.toDateString()}`,
      `Working Days: ${leaveRequest.workingDays}`,
      historyLines.length > 0 ? `\n*Approval Journey:*\n${historyLines}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });
}
