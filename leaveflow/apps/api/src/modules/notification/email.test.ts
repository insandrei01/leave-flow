/**
 * Unit tests for the email service and templates.
 *
 * All tests use a mocked Postmark adapter — no real network calls.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEmailService } from "./email.service.js";
import type { PostmarkAdapter, PostmarkMessage } from "./email.service.js";
import {
  renderWelcome,
  renderVerifyEmail,
  renderRequestSubmitted,
  renderApproved,
  renderRejected,
  renderReminder,
  renderPasswordReset,
} from "./email.templates.js";

// ----------------------------------------------------------------
// Mock Postmark adapter
// ----------------------------------------------------------------

function buildMockPostmark(
  overrides: Partial<PostmarkAdapter> = {}
): PostmarkAdapter & { calls: PostmarkMessage[] } {
  const calls: PostmarkMessage[] = [];
  return {
    sendEmail: vi.fn().mockImplementation(async (msg: PostmarkMessage) => {
      calls.push(msg);
      return { MessageID: "test-id", SubmittedAt: new Date().toISOString(), To: msg.To, ErrorCode: 0, Message: "OK" };
    }),
    calls,
    ...overrides,
  };
}

// ----------------------------------------------------------------
// Template rendering tests (pure functions)
// ----------------------------------------------------------------

describe("email templates — renderWelcome", () => {
  it("includes first name and company name in subject", () => {
    const result = renderWelcome({
      firstName: "Alice",
      companyName: "ACME Corp",
      loginUrl: "https://app.leaveflow.com/login",
    });

    expect(result.subject).toContain("ACME Corp");
    expect(result.htmlBody).toContain("Alice");
    expect(result.textBody).toContain("ACME Corp");
  });

  it("escapes HTML in company name", () => {
    const result = renderWelcome({
      firstName: "Bob",
      companyName: "<script>alert(1)</script>",
      loginUrl: "https://app.leaveflow.com/login",
    });

    expect(result.htmlBody).not.toContain("<script>");
    expect(result.htmlBody).toContain("&lt;script&gt;");
  });
});

describe("email templates — renderVerifyEmail", () => {
  it("includes verification URL and expiry", () => {
    const result = renderVerifyEmail({
      firstName: "Alice",
      verificationUrl: "https://app.leaveflow.com/verify?token=abc",
      expiresInHours: 24,
    });

    expect(result.subject).toContain("Verify");
    expect(result.htmlBody).toContain("24");
    expect(result.textBody).toContain("https://app.leaveflow.com/verify?token=abc");
  });
});

describe("email templates — renderRequestSubmitted", () => {
  it("includes leave type and dates", () => {
    const result = renderRequestSubmitted({
      employeeFirstName: "Alice",
      leaveTypeName: "Annual Leave",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      workingDays: 5,
      requestUrl: "https://app.leaveflow.com/requests/123",
    });

    expect(result.subject).toContain("Annual Leave");
    expect(result.htmlBody).toContain("2026-06-01");
    expect(result.textBody).toContain("5");
  });
});

describe("email templates — renderApproved", () => {
  it("mentions approver name", () => {
    const result = renderApproved({
      employeeFirstName: "Alice",
      leaveTypeName: "Sick Leave",
      startDate: "2026-06-01",
      endDate: "2026-06-03",
      workingDays: 3,
      approverName: "Bob Manager",
      dashboardUrl: "https://app.leaveflow.com/dashboard",
    });

    expect(result.subject).toContain("approved");
    expect(result.htmlBody).toContain("Bob Manager");
  });
});

describe("email templates — renderRejected", () => {
  it("includes reason when provided", () => {
    const result = renderRejected({
      employeeFirstName: "Alice",
      leaveTypeName: "Annual Leave",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
      reason: "Team at capacity",
      dashboardUrl: "https://app.leaveflow.com/dashboard",
    });

    expect(result.subject).toContain("declined");
    expect(result.htmlBody).toContain("Team at capacity");
    expect(result.textBody).toContain("Team at capacity");
  });

  it("handles null reason without error", () => {
    const result = renderRejected({
      employeeFirstName: "Alice",
      leaveTypeName: "Annual Leave",
      startDate: "2026-07-01",
      endDate: "2026-07-03",
      reason: null,
      dashboardUrl: "https://app.leaveflow.com/dashboard",
    });

    expect(result.subject).toBeDefined();
    expect(result.htmlBody).not.toContain("null");
    expect(result.textBody).not.toContain("null");
  });
});

describe("email templates — renderReminder", () => {
  it("uses singular 'day' when submittedDaysAgo is 1", () => {
    const result = renderReminder({
      managerFirstName: "Bob",
      employeeFullName: "Alice Smith",
      leaveTypeName: "Annual Leave",
      startDate: "2026-08-01",
      endDate: "2026-08-05",
      approvalUrl: "https://app.leaveflow.com/approve/456",
      submittedDaysAgo: 1,
    });

    expect(result.textBody).toContain("1 day ago");
    expect(result.textBody).not.toContain("1 days ago");
  });

  it("uses plural 'days' when submittedDaysAgo > 1", () => {
    const result = renderReminder({
      managerFirstName: "Bob",
      employeeFullName: "Alice Smith",
      leaveTypeName: "Annual Leave",
      startDate: "2026-08-01",
      endDate: "2026-08-05",
      approvalUrl: "https://app.leaveflow.com/approve/456",
      submittedDaysAgo: 3,
    });

    expect(result.textBody).toContain("3 days ago");
  });
});

describe("email templates — renderPasswordReset", () => {
  it("includes reset URL and expiry", () => {
    const result = renderPasswordReset({
      firstName: "Alice",
      resetUrl: "https://app.leaveflow.com/reset?token=xyz",
      expiresInMinutes: 30,
    });

    expect(result.subject).toContain("password");
    expect(result.textBody).toContain("30");
    expect(result.htmlBody).toContain("https://app.leaveflow.com/reset?token=xyz");
  });
});

// ----------------------------------------------------------------
// EmailService tests (delivery)
// ----------------------------------------------------------------

describe("EmailService", () => {
  let postmark: ReturnType<typeof buildMockPostmark>;

  beforeEach(() => {
    postmark = buildMockPostmark();
  });

  it("sends welcome email with correct from/to/subject", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendWelcome("alice@example.com", {
      firstName: "Alice",
      companyName: "ACME Corp",
      loginUrl: "https://app.leaveflow.com/login",
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
    const [msg] = (postmark.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0] as [PostmarkMessage];
    expect(msg.To).toBe("alice@example.com");
    expect(msg.From).toBe("noreply@acme.com");
    expect(msg.Subject).toContain("ACME Corp");
    expect(msg.MessageStream).toBe("outbound");
  });

  it("uses default from email when config fromEmail is undefined", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: undefined },
    });

    await service.sendWelcome("alice@example.com", {
      firstName: "Alice",
      companyName: "ACME",
      loginUrl: "https://login.example.com",
    });

    const [msg] = (postmark.sendEmail as ReturnType<typeof vi.fn>).mock.calls[0] as [PostmarkMessage];
    expect(msg.From).toBe("noreply@leaveflow.app");
  });

  it("sends verify email", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendVerifyEmail("alice@example.com", {
      firstName: "Alice",
      verificationUrl: "https://verify.example.com",
      expiresInHours: 48,
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
  });

  it("sends request submitted email", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendRequestSubmitted("alice@example.com", {
      employeeFirstName: "Alice",
      leaveTypeName: "Annual Leave",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      workingDays: 5,
      requestUrl: "https://app.example.com/requests/1",
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
  });

  it("sends approved email", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendApproved("alice@example.com", {
      employeeFirstName: "Alice",
      leaveTypeName: "Annual Leave",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      workingDays: 5,
      approverName: "Bob Manager",
      dashboardUrl: "https://app.example.com/dashboard",
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
  });

  it("sends rejected email", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendRejected("alice@example.com", {
      employeeFirstName: "Alice",
      leaveTypeName: "Annual Leave",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      reason: "No coverage",
      dashboardUrl: "https://app.example.com/dashboard",
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
  });

  it("sends reminder email", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendReminder("manager@example.com", {
      managerFirstName: "Bob",
      employeeFullName: "Alice Smith",
      leaveTypeName: "Annual Leave",
      startDate: "2026-06-01",
      endDate: "2026-06-05",
      approvalUrl: "https://app.example.com/approve/1",
      submittedDaysAgo: 2,
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
  });

  it("sends password reset email", async () => {
    const service = createEmailService({
      postmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await service.sendPasswordReset("alice@example.com", {
      firstName: "Alice",
      resetUrl: "https://app.example.com/reset?token=abc",
      expiresInMinutes: 30,
    });

    expect(postmark.sendEmail).toHaveBeenCalledOnce();
  });

  it("propagates Postmark errors", async () => {
    const failingPostmark = buildMockPostmark({
      sendEmail: vi.fn().mockRejectedValue(new Error("Postmark API error 422: Invalid email")),
    });
    const service = createEmailService({
      postmark: failingPostmark,
      config: { fromEmail: "noreply@acme.com" },
    });

    await expect(
      service.sendWelcome("bad@example.com", {
        firstName: "Bad",
        companyName: "Test",
        loginUrl: "https://login.example.com",
      })
    ).rejects.toThrow("Postmark API error");
  });
});
