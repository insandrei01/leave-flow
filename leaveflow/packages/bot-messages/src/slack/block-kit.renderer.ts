/**
 * Slack Block Kit renderer — transforms template data into valid Slack Block Kit JSON.
 *
 * References:
 * - Block Kit spec: https://api.slack.com/block-kit
 * - Max 25 blocks per message
 * - All outputs are plain JSON objects (no SDK types required)
 */

import type {
  ApprovalRequestData,
  ApprovedNotificationData,
  RejectedNotificationData,
  StaleReminderData,
  BalanceCheckData,
  TeamAnnouncementData,
  ApprovalStep,
} from "../types.js";

// ----------------------------------------------------------------
// Internal block builders
// ----------------------------------------------------------------

type SlackBlock = Record<string, unknown>;

function headerBlock(text: string): SlackBlock {
  return { type: "header", text: { type: "plain_text", text } };
}

function dividerBlock(): SlackBlock {
  return { type: "divider" };
}

function sectionBlock(text: string): SlackBlock {
  return { type: "section", text: { type: "mrkdwn", text } };
}

function fieldsBlock(fields: string[]): SlackBlock {
  return {
    type: "section",
    fields: fields.map((f) => ({ type: "mrkdwn", text: f })),
  };
}

function contextBlock(elements: string[]): SlackBlock {
  return {
    type: "context",
    elements: elements.map((e) => ({ type: "mrkdwn", text: e })),
  };
}

function actionsBlock(buttons: SlackBlock[]): SlackBlock {
  return { type: "actions", elements: buttons };
}

function primaryButton(text: string, actionId: string, value: string): SlackBlock {
  return {
    type: "button",
    text: { type: "plain_text", text },
    style: "primary",
    action_id: actionId,
    value,
  };
}

function dangerButton(text: string, actionId: string, value: string): SlackBlock {
  return {
    type: "button",
    text: { type: "plain_text", text },
    style: "danger",
    action_id: actionId,
    value,
  };
}

function linkButton(text: string, actionId: string, url: string): SlackBlock {
  return {
    type: "button",
    text: { type: "plain_text", text },
    action_id: actionId,
    url,
  };
}

function buildApprovalChainText(chain: readonly ApprovalStep[]): string {
  return chain
    .map((step) => {
      if (step.state === "completed") return `:white_check_mark: ${step.name}`;
      if (step.state === "active") return `:arrow_right: *${step.name}*`;
      return `:white_circle: ${step.name}`;
    })
    .join("  >  ");
}

function buildApprovalChainFinalText(chain: readonly ApprovalStep[]): string {
  return chain
    .map((step) => {
      if (step.state === "completed") return `:white_check_mark: ${step.name}`;
      if (step.state === "active") return `:x: ${step.name}`;
      return `:black_circle: ${step.name}`;
    })
    .join("  >  ");
}

function buildBalanceBar(used: number, total: number): string {
  const width = 14;
  const filled = total > 0 ? Math.round((used / total) * width) : 0;
  const bar = "=".repeat(filled) + "-".repeat(width - filled);
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return `|${bar}| ${used}/${total} (${pct}%)`;
}

// ----------------------------------------------------------------
// Public renderers
// ----------------------------------------------------------------

export interface SlackMessage {
  readonly blocks: readonly SlackBlock[];
}

/**
 * Renders an approval request card with Approve/Reject action buttons.
 * Sent to the approver's DM channel.
 */
export function renderApprovalRequest(data: ApprovalRequestData): SlackMessage {
  const othersOutText =
    data.othersOut.length > 0 ? data.othersOut.join(", ") : "None";

  const coverageEmoji = data.teamCoverage >= 80 ? ":white_check_mark:" : ":warning:";

  const blocks: SlackBlock[] = [
    headerBlock("Leave Request — Needs Your Approval"),
    dividerBlock(),
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${data.employeeName}* is requesting time off\n\`${data.leaveTypeName}\` | \`${data.workingDays} working day${data.workingDays === 1 ? "" : "s"}\` | \`${data.startDate} - ${data.endDate}\``,
      },
      ...(data.employeeAvatarUrl
        ? {
            accessory: {
              type: "image",
              image_url: data.employeeAvatarUrl,
              alt_text: data.employeeName,
            },
          }
        : {}),
    },
    fieldsBlock([
      `*Team:*\n${data.teamName}`,
      `*Balance After:*\n${data.balanceAfter} / ${data.balanceTotal} days`,
      `*Team Coverage:*\n${data.teamCoverage}% ${coverageEmoji}`,
      `*Others Out:*\n${othersOutText}`,
    ]),
  ];

  if (data.reason !== null) {
    blocks.push(
      contextBlock([`:speech_balloon: _"${data.reason}"_`])
    );
  }

  blocks.push(dividerBlock());
  blocks.push(sectionBlock(`*Approval Chain*\n${buildApprovalChainText(data.approvalChain)}`));

  const actionButtons: SlackBlock[] = [
    primaryButton("Approve", "approve_request", data.requestId),
    dangerButton("Reject", "reject_request", data.requestId),
    linkButton(
      "View in LeaveFlow",
      "view_request",
      `${data.appBaseUrl}/requests/${data.requestId}`
    ),
  ];
  blocks.push(actionsBlock(actionButtons));

  const footerParts: string[] = [`Submitted ${data.submittedAt} | Request \`${data.requestId}\``];
  if (data.autoEscalateInHours !== undefined) {
    footerParts.push(`Auto-escalation in ${data.autoEscalateInHours}h`);
  }
  blocks.push(contextBlock([`:clock3: ${footerParts.join(" | ")}`]));

  return Object.freeze({ blocks: Object.freeze(blocks) });
}

/**
 * Renders an approved notification.
 * Sent to the requesting employee's DM.
 */
export function renderApprovedNotification(
  data: ApprovedNotificationData
): SlackMessage {
  const blocks: SlackBlock[] = [
    sectionBlock(":tada: *Your leave request has been approved!*"),
    fieldsBlock([
      `*Type:*\n${data.leaveTypeName}`,
      `*Dates:*\n${data.startDate} - ${data.endDate}`,
      `*Working Days:*\n${data.workingDays}`,
      `*New Balance:*\n${data.newBalance} / ${data.totalBalance} days`,
    ]),
    dividerBlock(),
    sectionBlock(`*Journey Complete*\n${buildApprovalChainText(data.approvalChain)}`),
    contextBlock([
      `:calendar: Calendar event created | :bell: Team channel notified | Request \`${data.requestId}\``,
    ]),
  ];

  return Object.freeze({ blocks: Object.freeze(blocks) });
}

/**
 * Renders a rejected notification.
 * Sent to the requesting employee's DM.
 */
export function renderRejectedNotification(
  data: RejectedNotificationData
): SlackMessage {
  const blocks: SlackBlock[] = [
    sectionBlock(":x: *Your leave request was not approved*"),
    fieldsBlock([
      `*Type:*\n${data.leaveTypeName}`,
      `*Dates:*\n${data.startDate} - ${data.endDate}`,
      `*Rejected By:*\n${data.rejectedByName} (${data.rejectedByRole})`,
    ]),
    sectionBlock(`*Reason:*\n> _"${data.rejectionReason}"_`),
    dividerBlock(),
    sectionBlock(`*Journey*\n${buildApprovalChainFinalText(data.approvalChain)}`),
    actionsBlock([
      primaryButton("Submit New Request", "new_request", "new"),
    ]),
    contextBlock([
      `:information_source: Your balance was not affected | Request \`${data.requestId}\``,
    ]),
  ];

  return Object.freeze({ blocks: Object.freeze(blocks) });
}

/**
 * Renders a stale request reminder.
 * Sent to an approver who has not acted within the expected timeframe.
 */
export function renderStaleReminder(data: StaleReminderData): SlackMessage {
  const footerParts: string[] = [`Reminder ${data.reminderNumber} of ${data.totalReminders}`];
  if (data.autoEscalateInHours !== undefined) {
    footerParts.push(
      `:warning: This request will auto-escalate in *~${data.autoEscalateInHours} hours*`
    );
  }

  const blocks: SlackBlock[] = [
    sectionBlock(
      `:hourglass: *Reminder: Pending leave request*\n\n${data.employeeName}'s ${data.leaveTypeName} request has been waiting for *${data.waitingHours} hours*.`
    ),
    fieldsBlock([
      `*Employee:*\n${data.employeeName}`,
      `*Dates:*\n${data.startDate} - ${data.endDate}`,
      `*Days:*\n${data.workingDays} (${data.leaveTypeName})`,
      `*Waiting Since:*\n${data.waitingSince}`,
    ]),
    actionsBlock([
      primaryButton("Approve Now", "approve_request", data.requestId),
      dangerButton("Reject", "reject_request", data.requestId),
    ]),
    contextBlock([footerParts.join(" | ")]),
  ];

  return Object.freeze({ blocks: Object.freeze(blocks) });
}

/**
 * Renders a balance check response.
 * Sent inline in response to a /leave balance command.
 */
export function renderBalanceCheck(data: BalanceCheckData): SlackMessage {
  const barLines = data.balances
    .map((b) => {
      const label = b.leaveTypeName.padEnd(12, " ");
      const bar = buildBalanceBar(b.used, b.total);
      return `${label} ${bar}`;
    })
    .join("\n");

  const footerParts: string[] = [`Fiscal year ${data.fiscalYear}`];
  if (data.nextAccrualDate !== undefined && data.nextAccrualDays !== undefined) {
    footerParts.unshift(
      `:calendar: Next accrual: ${data.nextAccrualDate} (+${data.nextAccrualDays} days)`
    );
  }

  const blocks: SlackBlock[] = [
    sectionBlock(`:bar_chart: *Your Leave Balances*`),
    sectionBlock(`\`\`\`\n${barLines}\n\`\`\``),
    contextBlock([`:information_source: ${footerParts.join(" | ")}`]),
  ];

  return Object.freeze({ blocks: Object.freeze(blocks) });
}

/**
 * Renders a team channel announcement (privacy-safe — no leave type).
 */
export function renderTeamAnnouncement(data: TeamAnnouncementData): SlackMessage {
  const blocks: SlackBlock[] = [
    contextBlock([
      `:palm_tree: *${data.employeeName}* will be out *${data.startDate} - ${data.endDate}* (${data.workingDays} day${data.workingDays === 1 ? "" : "s"})`,
    ]),
  ];

  return Object.freeze({ blocks: Object.freeze(blocks) });
}
