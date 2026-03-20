/**
 * Teams Adaptive Card renderer — transforms template data into valid Adaptive Card JSON.
 *
 * References:
 * - Adaptive Cards spec: https://adaptivecards.io/
 * - Version: 1.5
 * - Payload limit: 28KB
 * - Action.Execute for interactive buttons (Universal Action Model)
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
// Adaptive Card schema constants
// ----------------------------------------------------------------

const SCHEMA = "http://adaptivecards.io/schemas/adaptive-card.json";
const VERSION = "1.5";

// ----------------------------------------------------------------
// Internal element builders
// ----------------------------------------------------------------

type CardElement = Record<string, unknown>;

function textBlock(
  text: string,
  options: {
    weight?: "Bolder" | "Default";
    size?: "Small" | "Medium" | "Large" | "Default";
    color?: "Good" | "Attention" | "Warning" | "Accent" | "Default";
    isSubtle?: boolean;
    wrap?: boolean;
    spacing?: "None";
    horizontalAlignment?: "Left" | "Center" | "Right";
  } = {}
): CardElement {
  return {
    type: "TextBlock",
    text,
    wrap: options.wrap ?? true,
    ...(options.weight ? { weight: options.weight } : {}),
    ...(options.size ? { size: options.size } : {}),
    ...(options.color ? { color: options.color } : {}),
    ...(options.isSubtle ? { isSubtle: true } : {}),
    ...(options.spacing ? { spacing: options.spacing } : {}),
    ...(options.horizontalAlignment
      ? { horizontalAlignment: options.horizontalAlignment }
      : {}),
  };
}

function factSet(facts: Array<{ title: string; value: string }>): CardElement {
  return { type: "FactSet", facts };
}

function columnSet(columns: CardElement[]): CardElement {
  return { type: "ColumnSet", columns };
}

function column(
  width: string | "auto" | "stretch",
  items: CardElement[]
): CardElement {
  return { type: "Column", width, items };
}

function container(
  items: CardElement[],
  style?: "emphasis" | "attention" | "good" | "warning"
): CardElement {
  return {
    type: "Container",
    items,
    ...(style ? { style } : {}),
  };
}

function executeAction(
  title: string,
  verb: string,
  data: Record<string, unknown>,
  style?: "positive" | "destructive"
): CardElement {
  return {
    type: "Action.Execute",
    title,
    verb,
    data,
    ...(style ? { style } : {}),
  };
}

function openUrlAction(title: string, url: string): CardElement {
  return { type: "Action.OpenUrl", title, url };
}

function buildApprovalChainColumnSet(chain: readonly ApprovalStep[]): CardElement {
  const columns: CardElement[] = [];

  chain.forEach((step, index) => {
    if (index > 0) {
      columns.push(
        column("auto", [
          textBlock("->", { size: "Small", isSubtle: true }),
        ])
      );
    }

    const color =
      step.state === "completed"
        ? "Good"
        : step.state === "active"
          ? "Accent"
          : undefined;

    const text =
      step.state === "active" ? `**${step.name}**` : step.name;

    columns.push(
      column("auto", [
        textBlock(text, { size: "Small", ...(color ? { color } : { isSubtle: step.state === "pending" }) }),
      ])
    );
  });

  return columnSet(columns);
}

function buildApprovalChainText(chain: readonly ApprovalStep[]): string {
  return chain
    .map((step) => {
      if (step.state === "completed") return step.name;
      if (step.state === "active") return `**${step.name}**`;
      return step.name;
    })
    .join(" -> ");
}

// ----------------------------------------------------------------
// Adaptive Card wrapper
// ----------------------------------------------------------------

export interface AdaptiveCard {
  readonly type: "AdaptiveCard";
  readonly $schema: string;
  readonly version: string;
  readonly body: readonly CardElement[];
  readonly actions?: readonly CardElement[];
}

function buildCard(
  body: CardElement[],
  actions?: CardElement[]
): AdaptiveCard {
  return Object.freeze({
    type: "AdaptiveCard" as const,
    $schema: SCHEMA,
    version: VERSION,
    body: Object.freeze(body),
    ...(actions && actions.length > 0
      ? { actions: Object.freeze(actions) }
      : {}),
  });
}

// ----------------------------------------------------------------
// Public renderers
// ----------------------------------------------------------------

/**
 * Renders an approval request card with Approve/Reject actions.
 * Sent to the approver's DM via Bot Framework.
 */
export function renderApprovalRequest(data: ApprovalRequestData): AdaptiveCard {
  const dateRange = `${data.startDate} - ${data.endDate.split("-")[2] ?? data.endDate}`;

  const avatarCol = data.employeeAvatarUrl
    ? [
        column("auto", [
          {
            type: "Image",
            url: data.employeeAvatarUrl,
            size: "Small",
            style: "Person",
            altText: data.employeeName,
          },
        ]),
      ]
    : [];

  const headerColumns = [
    ...avatarCol,
    column("stretch", [
      textBlock(`**${data.employeeName}**`, { wrap: true }),
      textBlock(`${data.teamName} | ${data.leaveTypeName} | ${data.workingDays} working day${data.workingDays === 1 ? "" : "s"}`, {
        isSubtle: true,
        spacing: "None",
        size: "Small",
        wrap: true,
      }),
    ]),
    column("auto", [
      textBlock(dateRange, {
        weight: "Bolder",
        horizontalAlignment: "Right",
      }),
    ]),
  ];

  const othersOutValue =
    data.othersOut.length > 0 ? data.othersOut.join(", ") : "None";
  const coverageValue = `${data.teamCoverage}%${data.teamCoverage >= 80 ? " OK" : " Low"}`;

  const footerParts: string[] = [`Submitted ${data.submittedAt}`];
  if (data.autoEscalateInHours !== undefined) {
    footerParts.push(`Auto-escalation in ${data.autoEscalateInHours}h`);
  }

  const body: CardElement[] = [
    textBlock("Leave Request — Needs Your Approval", {
      weight: "Bolder",
      size: "Medium",
      wrap: true,
    }),
    columnSet(headerColumns),
    factSet([
      { title: "Balance After", value: `${data.balanceAfter} / ${data.balanceTotal} days` },
      { title: "Team Coverage", value: coverageValue },
      { title: "Others Out", value: othersOutValue },
      ...(data.reason !== null
        ? [{ title: "Reason", value: data.reason }]
        : []),
    ]),
    container(
      [
        textBlock("**Approval Chain**", { size: "Small" }),
        buildApprovalChainColumnSet(data.approvalChain),
      ],
      "emphasis"
    ),
    textBlock(footerParts.join(" | "), { size: "Small", isSubtle: true, wrap: true }),
  ];

  const actions: CardElement[] = [
    executeAction("Approve", "approve", { requestId: data.requestId }, "positive"),
    executeAction("Reject", "reject", { requestId: data.requestId }, "destructive"),
    openUrlAction("View in LeaveFlow", `${data.appBaseUrl}/requests/${data.requestId}`),
  ];

  return buildCard(body, actions);
}

/**
 * Renders an approved notification card.
 * Sent to the requesting employee.
 */
export function renderApprovedNotification(
  data: ApprovedNotificationData
): AdaptiveCard {
  const journeyText = buildApprovalChainText(data.approvalChain);

  const body: CardElement[] = [
    textBlock("Your leave request has been approved!", {
      weight: "Bolder",
      size: "Medium",
      color: "Good",
      wrap: true,
    }),
    factSet([
      { title: "Type", value: data.leaveTypeName },
      {
        title: "Dates",
        value: `${data.startDate} - ${data.endDate} (${data.workingDays} day${data.workingDays === 1 ? "" : "s"})`,
      },
      {
        title: "New Balance",
        value: `${data.newBalance} / ${data.totalBalance} days`,
      },
    ]),
    container(
      [
        textBlock(`${journeyText} -> **Done**`, {
          size: "Small",
          color: "Good",
          wrap: true,
        }),
      ],
      "emphasis"
    ),
    textBlock("Calendar event created | Team channel notified", {
      size: "Small",
      isSubtle: true,
      wrap: true,
    }),
  ];

  return buildCard(body);
}

/**
 * Renders a rejected notification card.
 * Sent to the requesting employee.
 */
export function renderRejectedNotification(
  data: RejectedNotificationData
): AdaptiveCard {
  const body: CardElement[] = [
    textBlock("Your leave request was not approved", {
      weight: "Bolder",
      size: "Medium",
      color: "Attention",
      wrap: true,
    }),
    factSet([
      { title: "Type", value: data.leaveTypeName },
      { title: "Dates", value: `${data.startDate} - ${data.endDate}` },
      {
        title: "Rejected By",
        value: `${data.rejectedByName} (${data.rejectedByRole})`,
      },
    ]),
    container(
      [
        textBlock(
          `**Reason:** "${data.rejectionReason}"`,
          { wrap: true, size: "Small" }
        ),
      ],
      "attention"
    ),
    textBlock("Your balance was not affected.", {
      size: "Small",
      isSubtle: true,
      wrap: true,
    }),
  ];

  const actions: CardElement[] = [
    executeAction("Submit New Request", "new_request", {}, "positive"),
  ];

  return buildCard(body, actions);
}

/**
 * Renders a stale reminder card.
 * Sent to an approver who has not acted.
 */
export function renderStaleReminder(data: StaleReminderData): AdaptiveCard {
  const footerParts: string[] = [
    `Reminder ${data.reminderNumber} of ${data.totalReminders}`,
  ];
  if (data.autoEscalateInHours !== undefined) {
    footerParts.push(`Auto-escalation in ~${data.autoEscalateInHours}h`);
  }

  const body: CardElement[] = [
    textBlock(
      `Reminder: ${data.employeeName}'s ${data.leaveTypeName} request has been waiting for ${data.waitingHours} hours.`,
      { weight: "Bolder", size: "Medium", wrap: true }
    ),
    factSet([
      { title: "Employee", value: data.employeeName },
      { title: "Dates", value: `${data.startDate} - ${data.endDate}` },
      { title: "Days", value: `${data.workingDays} (${data.leaveTypeName})` },
      { title: "Waiting Since", value: data.waitingSince },
    ]),
    textBlock(footerParts.join(" | "), {
      size: "Small",
      isSubtle: true,
      wrap: true,
    }),
  ];

  const actions: CardElement[] = [
    executeAction("Approve Now", "approve", { requestId: data.requestId }, "positive"),
    executeAction("Reject", "reject", { requestId: data.requestId }, "destructive"),
  ];

  return buildCard(body, actions);
}

/**
 * Renders a balance check card.
 */
export function renderBalanceCheck(data: BalanceCheckData): AdaptiveCard {
  const balanceCols = data.balances.map((b) => {
    const pct = b.total > 0 ? Math.round((b.used / b.total) * 100) : 0;
    const color =
      pct < 30 ? "Warning" : pct < 60 ? undefined : undefined;
    return column("stretch", [
      textBlock(`**${b.leaveTypeName}**`, { size: "Small" }),
      textBlock(
        `${b.used} / ${b.total} days (${pct}%)`,
        {
          size: "Small",
          isSubtle: true,
          spacing: "None",
          ...(color ? { color: color as "Warning" } : {}),
        }
      ),
    ]);
  });

  const footerParts: string[] = [`Fiscal year ${data.fiscalYear}`];
  if (data.nextAccrualDate !== undefined && data.nextAccrualDays !== undefined) {
    footerParts.unshift(
      `Next accrual: ${data.nextAccrualDate} (+${data.nextAccrualDays} days)`
    );
  }

  const body: CardElement[] = [
    textBlock("Your Leave Balances", { weight: "Bolder", size: "Medium" }),
    columnSet(balanceCols),
    textBlock(footerParts.join(" | "), {
      size: "Small",
      isSubtle: true,
      wrap: true,
    }),
  ];

  return buildCard(body);
}

/**
 * Renders a team channel announcement card (privacy-safe, no leave type).
 */
export function renderTeamAnnouncement(data: TeamAnnouncementData): AdaptiveCard {
  const body: CardElement[] = [
    textBlock(
      `${data.employeeName} will be out ${data.startDate} - ${data.endDate} (${data.workingDays} day${data.workingDays === 1 ? "" : "s"})`,
      { size: "Small", isSubtle: true, wrap: true }
    ),
  ];

  return buildCard(body);
}
