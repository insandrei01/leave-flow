/**
 * Bot message renderer tests — Slack Block Kit and Teams Adaptive Cards.
 *
 * Tests verify:
 * - Output structure matches platform spec
 * - All data fields are correctly mapped
 * - Privacy rules are respected (BR-092)
 * - Template builder validation
 */

import { describe, it, expect } from "vitest";
import type { ApprovalStep } from "../types.js";
import {
  buildApprovalRequestData,
  buildApprovedNotificationData,
  buildRejectedNotificationData,
  buildStaleReminderData,
  buildBalanceCheckData,
  buildTeamAnnouncementData,
} from "../templates/approval-request.js";
import { buildApprovalRequestData as buildApproval } from "../templates/approval-request.js";
import { buildApprovedNotificationData as buildApproved } from "../templates/approved-notification.js";
import { buildRejectedNotificationData as buildRejected } from "../templates/rejected-notification.js";
import { buildStaleReminderData as buildStale } from "../templates/stale-reminder.js";
import { buildBalanceCheckData as buildBalance } from "../templates/balance-check.js";
import { buildTeamAnnouncementData as buildAnnouncement } from "../templates/team-announcement.js";

import {
  renderApprovalRequest as renderSlackApproval,
  renderApprovedNotification as renderSlackApproved,
  renderRejectedNotification as renderSlackRejected,
  renderStaleReminder as renderSlackStale,
  renderBalanceCheck as renderSlackBalance,
  renderTeamAnnouncement as renderSlackAnnouncement,
} from "../slack/block-kit.renderer.js";

import {
  renderApprovalRequest as renderTeamsApproval,
  renderApprovedNotification as renderTeamsApproved,
  renderRejectedNotification as renderTeamsRejected,
  renderStaleReminder as renderTeamsStale,
  renderBalanceCheck as renderTeamsBalance,
  renderTeamAnnouncement as renderTeamsAnnouncement,
} from "../teams/adaptive-card.renderer.js";

// ----------------------------------------------------------------
// Fixtures
// ----------------------------------------------------------------

const APPROVAL_CHAIN: ApprovalStep[] = [
  { name: "Submitted", state: "completed" },
  { name: "You (Manager)", state: "active" },
  { name: "HR Review", state: "pending" },
  { name: "Done", state: "pending" },
];

const APPROVAL_CHAIN_DONE: ApprovalStep[] = [
  { name: "Submitted", state: "completed" },
  { name: "Manager (Tom W.)", state: "completed" },
  { name: "HR (Sarah C.)", state: "completed" },
  { name: "Done", state: "completed" },
];

const APPROVAL_CHAIN_REJECTED: ApprovalStep[] = [
  { name: "Submitted", state: "completed" },
  { name: "Manager (Tom W.)", state: "active" },
  { name: "HR", state: "pending" },
  { name: "Done", state: "pending" },
];

function makeApprovalData() {
  return buildApproval({
    requestId: "LR-2026-0342",
    employeeName: "Maria Santos",
    employeeAvatarUrl: "https://api.leaveflow.io/avatars/maria-santos.png",
    leaveTypeName: "PTO",
    startDate: "Mar 25",
    endDate: "Mar 27",
    workingDays: 3,
    reason: "Family visiting from out of town",
    teamName: "Engineering",
    balanceAfter: 12,
    balanceTotal: 20,
    teamCoverage: 92,
    othersOut: ["Alex K.", "Rachel H."],
    approvalChain: APPROVAL_CHAIN,
    submittedAt: "today at 10:24am",
    autoEscalateInHours: 24,
    appBaseUrl: "https://app.leaveflow.io",
  });
}

function makeApprovedData() {
  return buildApproved({
    requestId: "LR-2026-0342",
    leaveTypeName: "PTO",
    startDate: "Mar 25",
    endDate: "Mar 27",
    workingDays: 3,
    newBalance: 12,
    totalBalance: 20,
    approvalChain: APPROVAL_CHAIN_DONE,
  });
}

function makeRejectedData() {
  return buildRejected({
    requestId: "LR-2026-0342",
    leaveTypeName: "PTO",
    startDate: "Mar 25",
    endDate: "Mar 27",
    rejectedByName: "Tom Wilson",
    rejectedByRole: "Manager",
    rejectionReason: "Team has a critical deadline on Mar 26.",
    approvalChain: APPROVAL_CHAIN_REJECTED,
    appBaseUrl: "https://app.leaveflow.io",
  });
}

function makeStaleData() {
  return buildStale({
    requestId: "LR-2026-0338",
    employeeName: "Dan Kim",
    startDate: "Mar 20",
    endDate: "Mar 24",
    leaveTypeName: "Annual Leave",
    workingDays: 5,
    waitingHours: 52,
    waitingSince: "Mar 14, 2:30pm",
    reminderNumber: 2,
    totalReminders: 3,
    autoEscalateInHours: 20,
    appBaseUrl: "https://app.leaveflow.io",
  });
}

function makeBalanceData() {
  return buildBalance({
    employeeName: "Maria Santos",
    balances: [
      { leaveTypeName: "Vacation", used: 15, total: 20 },
      { leaveTypeName: "Sick Leave", used: 9, total: 10 },
      { leaveTypeName: "Personal", used: 2, total: 5 },
    ],
    nextAccrualDate: "Apr 1",
    nextAccrualDays: 1.67,
    fiscalYear: 2026,
  });
}

function makeAnnouncementData() {
  return buildAnnouncement({
    employeeName: "Maria Santos",
    startDate: "Mar 25",
    endDate: "Mar 27",
    workingDays: 3,
  });
}

// ----------------------------------------------------------------
// Template builder validation
// ----------------------------------------------------------------

describe("Template builders — validation", () => {
  it("throws when requestId is empty in approval request", () => {
    expect(() =>
      buildApproval({
        requestId: "",
        employeeName: "Test",
        leaveTypeName: "PTO",
        startDate: "Mar 1",
        endDate: "Mar 2",
        workingDays: 1,
        teamName: "Eng",
        balanceAfter: 5,
        balanceTotal: 10,
        teamCoverage: 100,
        approvalChain: [],
        submittedAt: "today",
        appBaseUrl: "https://app.leaveflow.io",
      })
    ).toThrow("requestId is required");
  });

  it("throws when workingDays <= 0 in approval request", () => {
    expect(() =>
      buildApproval({
        requestId: "LR-001",
        employeeName: "Test",
        leaveTypeName: "PTO",
        startDate: "Mar 1",
        endDate: "Mar 2",
        workingDays: 0,
        teamName: "Eng",
        balanceAfter: 5,
        balanceTotal: 10,
        teamCoverage: 100,
        approvalChain: [],
        submittedAt: "today",
        appBaseUrl: "https://app.leaveflow.io",
      })
    ).toThrow("workingDays must be positive");
  });

  it("throws when rejectionReason is empty in rejected notification", () => {
    expect(() =>
      buildRejected({
        requestId: "LR-001",
        leaveTypeName: "PTO",
        startDate: "Mar 1",
        endDate: "Mar 2",
        rejectedByName: "Tom",
        rejectedByRole: "Manager",
        rejectionReason: "",
        approvalChain: [],
        appBaseUrl: "https://app.leaveflow.io",
      })
    ).toThrow("rejectionReason is required");
  });

  it("throws when reminderNumber > totalReminders in stale reminder", () => {
    expect(() =>
      buildStale({
        requestId: "LR-001",
        employeeName: "Dan",
        startDate: "Mar 1",
        endDate: "Mar 5",
        leaveTypeName: "PTO",
        workingDays: 3,
        waitingHours: 48,
        waitingSince: "Mar 14",
        reminderNumber: 5,
        totalReminders: 3,
        appBaseUrl: "https://app.leaveflow.io",
      })
    ).toThrow("reminderNumber");
  });

  it("throws when employeeName is empty in team announcement", () => {
    expect(() =>
      buildAnnouncement({
        employeeName: "  ",
        startDate: "Mar 25",
        endDate: "Mar 27",
        workingDays: 3,
      })
    ).toThrow("employeeName is required");
  });
});

// ----------------------------------------------------------------
// Slack Block Kit renderer
// ----------------------------------------------------------------

describe("Slack Block Kit renderer — approval request", () => {
  it("returns an object with blocks array", () => {
    const result = renderSlackApproval(makeApprovalData());
    expect(result).toHaveProperty("blocks");
    expect(Array.isArray(result.blocks)).toBe(true);
    expect(result.blocks.length).toBeGreaterThan(0);
  });

  it("starts with a header block", () => {
    const result = renderSlackApproval(makeApprovalData());
    expect(result.blocks[0]).toMatchObject({ type: "header" });
  });

  it("contains an actions block with approve and reject buttons", () => {
    const result = renderSlackApproval(makeApprovalData());
    const actionsBlock = result.blocks.find((b) => b["type"] === "actions");
    expect(actionsBlock).toBeDefined();
    const elements = actionsBlock!["elements"] as Array<Record<string, unknown>>;
    const approveBtn = elements.find((e) => e["action_id"] === "approve_request");
    const rejectBtn = elements.find((e) => e["action_id"] === "reject_request");
    expect(approveBtn).toBeDefined();
    expect(rejectBtn).toBeDefined();
    expect(approveBtn!["style"]).toBe("primary");
    expect(rejectBtn!["style"]).toBe("danger");
  });

  it("includes the request ID in button values", () => {
    const result = renderSlackApproval(makeApprovalData());
    const actionsBlock = result.blocks.find((b) => b["type"] === "actions")!;
    const elements = actionsBlock["elements"] as Array<Record<string, unknown>>;
    const approveBtn = elements.find((e) => e["action_id"] === "approve_request")!;
    expect(approveBtn["value"]).toBe("LR-2026-0342");
  });

  it("includes employee name in a section", () => {
    const result = renderSlackApproval(makeApprovalData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("Maria Santos");
  });

  it("stays within 25 block limit", () => {
    const result = renderSlackApproval(makeApprovalData());
    expect(result.blocks.length).toBeLessThanOrEqual(25);
  });
});

describe("Slack Block Kit renderer — approved notification", () => {
  it("returns blocks with celebration emoji", () => {
    const result = renderSlackApproved(makeApprovedData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain(":tada:");
  });

  it("includes request ID in footer", () => {
    const result = renderSlackApproved(makeApprovedData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("LR-2026-0342");
  });

  it("does NOT include action buttons (terminal state)", () => {
    const result = renderSlackApproved(makeApprovedData());
    const hasActions = result.blocks.some((b) => b["type"] === "actions");
    expect(hasActions).toBe(false);
  });
});

describe("Slack Block Kit renderer — rejected notification", () => {
  it("contains x emoji", () => {
    const result = renderSlackRejected(makeRejectedData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain(":x:");
  });

  it("includes rejection reason", () => {
    const result = renderSlackRejected(makeRejectedData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("critical deadline");
  });

  it("has a new request action button", () => {
    const result = renderSlackRejected(makeRejectedData());
    const actionsBlock = result.blocks.find((b) => b["type"] === "actions");
    expect(actionsBlock).toBeDefined();
  });
});

describe("Slack Block Kit renderer — stale reminder", () => {
  it("mentions waiting hours", () => {
    const result = renderSlackStale(makeStaleData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("52");
  });

  it("contains approve and reject buttons", () => {
    const result = renderSlackStale(makeStaleData());
    const actionsBlock = result.blocks.find((b) => b["type"] === "actions")!;
    const elements = actionsBlock["elements"] as Array<Record<string, unknown>>;
    expect(elements.some((e) => e["action_id"] === "approve_request")).toBe(true);
    expect(elements.some((e) => e["action_id"] === "reject_request")).toBe(true);
  });
});

describe("Slack Block Kit renderer — balance check", () => {
  it("returns blocks with bar chart emoji", () => {
    const result = renderSlackBalance(makeBalanceData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain(":bar_chart:");
  });

  it("includes all leave type names", () => {
    const result = renderSlackBalance(makeBalanceData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("Vacation");
    expect(text).toContain("Sick Leave");
    expect(text).toContain("Personal");
  });

  it("uses a code block for balance bars", () => {
    const result = renderSlackBalance(makeBalanceData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("```");
  });
});

describe("Slack Block Kit renderer — team announcement (BR-092)", () => {
  it("does NOT include any leave type name", () => {
    const result = renderSlackAnnouncement(makeAnnouncementData());
    const text = JSON.stringify(result.blocks);
    // Privacy rule: leave type must not appear in team announcements
    expect(text).not.toContain("PTO");
    expect(text).not.toContain("Annual Leave");
    expect(text).not.toContain("Vacation");
  });

  it("includes employee name and dates", () => {
    const result = renderSlackAnnouncement(makeAnnouncementData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain("Maria Santos");
    expect(text).toContain("Mar 25");
    expect(text).toContain("Mar 27");
  });

  it("uses palm tree emoji", () => {
    const result = renderSlackAnnouncement(makeAnnouncementData());
    const text = JSON.stringify(result.blocks);
    expect(text).toContain(":palm_tree:");
  });

  it("is minimal — only one block", () => {
    const result = renderSlackAnnouncement(makeAnnouncementData());
    expect(result.blocks).toHaveLength(1);
  });
});

// ----------------------------------------------------------------
// Teams Adaptive Card renderer
// ----------------------------------------------------------------

describe("Teams Adaptive Card renderer — structure", () => {
  it("approval request has correct AdaptiveCard envelope", () => {
    const result = renderTeamsApproval(makeApprovalData());
    expect(result.type).toBe("AdaptiveCard");
    expect(result.$schema).toBe("http://adaptivecards.io/schemas/adaptive-card.json");
    expect(result.version).toBe("1.5");
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body.length).toBeGreaterThan(0);
  });

  it("approval request has Action.Execute for approve and reject", () => {
    const result = renderTeamsApproval(makeApprovalData());
    expect(result.actions).toBeDefined();
    const actions = result.actions as Array<Record<string, unknown>>;
    const approveAction = actions.find((a) => a["verb"] === "approve");
    const rejectAction = actions.find((a) => a["verb"] === "reject");
    expect(approveAction).toBeDefined();
    expect(rejectAction).toBeDefined();
    expect(approveAction!["type"]).toBe("Action.Execute");
    expect(rejectAction!["type"]).toBe("Action.Execute");
    expect(approveAction!["style"]).toBe("positive");
    expect(rejectAction!["style"]).toBe("destructive");
  });

  it("approval request includes requestId in action data", () => {
    const result = renderTeamsApproval(makeApprovalData());
    const actions = result.actions as Array<Record<string, unknown>>;
    const approveAction = actions.find((a) => a["verb"] === "approve")!;
    expect((approveAction["data"] as Record<string, unknown>)["requestId"]).toBe(
      "LR-2026-0342"
    );
  });

  it("approved notification has Good color on header text", () => {
    const result = renderTeamsApproved(makeApprovedData());
    const text = JSON.stringify(result.body);
    expect(text).toContain("Good");
  });

  it("rejected notification has Attention color on header text", () => {
    const result = renderTeamsRejected(makeRejectedData());
    const text = JSON.stringify(result.body);
    expect(text).toContain("Attention");
  });

  it("rejected notification container uses attention style", () => {
    const result = renderTeamsRejected(makeRejectedData());
    const text = JSON.stringify(result.body);
    expect(text).toContain("attention");
  });

  it("stale reminder has approve and reject actions", () => {
    const result = renderTeamsStale(makeStaleData());
    const actions = result.actions as Array<Record<string, unknown>>;
    expect(actions.find((a) => a["verb"] === "approve")).toBeDefined();
    expect(actions.find((a) => a["verb"] === "reject")).toBeDefined();
  });

  it("balance check has a ColumnSet for the balances", () => {
    const result = renderTeamsBalance(makeBalanceData());
    const text = JSON.stringify(result.body);
    expect(text).toContain("ColumnSet");
  });

  it("team announcement does NOT include leave type name (BR-092)", () => {
    const result = renderTeamsAnnouncement(makeAnnouncementData());
    const text = JSON.stringify(result.body);
    expect(text).not.toContain("PTO");
    expect(text).not.toContain("Annual Leave");
  });

  it("team announcement body has 1 element (minimal)", () => {
    const result = renderTeamsAnnouncement(makeAnnouncementData());
    expect(result.body).toHaveLength(1);
  });

  it("team announcement does NOT have actions", () => {
    const result = renderTeamsAnnouncement(makeAnnouncementData());
    expect(result.actions).toBeUndefined();
  });
});

// ----------------------------------------------------------------
// Immutability
// ----------------------------------------------------------------

describe("Renderers — immutability", () => {
  it("Slack message blocks array is frozen", () => {
    const result = renderSlackApproval(makeApprovalData());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.blocks)).toBe(true);
  });

  it("Teams card body array is frozen", () => {
    const result = renderTeamsApproval(makeApprovalData());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.body)).toBe(true);
  });

  it("template data objects are frozen", () => {
    const data = makeApprovalData();
    expect(Object.isFrozen(data)).toBe(true);
  });
});
