/**
 * Email templates for Postmark.
 *
 * Seven transactional email templates:
 * 1. welcome           — new user joined
 * 2. verify-email      — email address verification
 * 3. request-submitted — leave request confirmation to employee
 * 4. approved          — leave request approved
 * 5. rejected          — leave request rejected
 * 6. reminder          — pending approval reminder to manager
 * 7. password-reset    — password reset link
 */

// ----------------------------------------------------------------
// Template data types
// ----------------------------------------------------------------

export interface WelcomeTemplateData {
  firstName: string;
  companyName: string;
  loginUrl: string;
}

export interface VerifyEmailTemplateData {
  firstName: string;
  verificationUrl: string;
  expiresInHours: number;
}

export interface RequestSubmittedTemplateData {
  employeeFirstName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  requestUrl: string;
}

export interface ApprovedTemplateData {
  employeeFirstName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  workingDays: number;
  approverName: string;
  dashboardUrl: string;
}

export interface RejectedTemplateData {
  employeeFirstName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  dashboardUrl: string;
}

export interface ReminderTemplateData {
  managerFirstName: string;
  employeeFullName: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  approvalUrl: string;
  submittedDaysAgo: number;
}

export interface PasswordResetTemplateData {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
}

// ----------------------------------------------------------------
// Rendered template output
// ----------------------------------------------------------------

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}

// ----------------------------------------------------------------
// Template renderers (pure functions — no side effects)
// ----------------------------------------------------------------

export function renderWelcome(data: WelcomeTemplateData): RenderedEmail {
  const subject = `Welcome to ${data.companyName} on LeaveFlow`;
  const htmlBody = `
    <h1>Welcome, ${escapeHtml(data.firstName)}!</h1>
    <p>You have been added to <strong>${escapeHtml(data.companyName)}</strong> on LeaveFlow.</p>
    <p>Click the button below to log in and set up your account.</p>
    <p><a href="${escapeHtml(data.loginUrl)}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Get Started</a></p>
    <p>If you did not expect this email, you can safely ignore it.</p>
  `.trim();
  const textBody = `Welcome, ${data.firstName}!\n\nYou have been added to ${data.companyName} on LeaveFlow.\n\nLog in here: ${data.loginUrl}`;

  return { subject, htmlBody, textBody };
}

export function renderVerifyEmail(data: VerifyEmailTemplateData): RenderedEmail {
  const subject = "Verify your LeaveFlow email address";
  const htmlBody = `
    <h1>Hi ${escapeHtml(data.firstName)},</h1>
    <p>Please verify your email address by clicking the link below.</p>
    <p><a href="${escapeHtml(data.verificationUrl)}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Verify Email</a></p>
    <p>This link expires in ${data.expiresInHours} hour${data.expiresInHours !== 1 ? "s" : ""}.</p>
    <p>If you did not request this verification, you can safely ignore this email.</p>
  `.trim();
  const textBody = `Hi ${data.firstName},\n\nVerify your email: ${data.verificationUrl}\n\nThis link expires in ${data.expiresInHours} hour(s).`;

  return { subject, htmlBody, textBody };
}

export function renderRequestSubmitted(
  data: RequestSubmittedTemplateData
): RenderedEmail {
  const subject = `Leave request submitted — ${data.leaveTypeName}`;
  const htmlBody = `
    <h1>Hi ${escapeHtml(data.employeeFirstName)},</h1>
    <p>Your leave request has been submitted successfully.</p>
    <table>
      <tr><td><strong>Type</strong></td><td>${escapeHtml(data.leaveTypeName)}</td></tr>
      <tr><td><strong>Start</strong></td><td>${escapeHtml(data.startDate)}</td></tr>
      <tr><td><strong>End</strong></td><td>${escapeHtml(data.endDate)}</td></tr>
      <tr><td><strong>Working days</strong></td><td>${data.workingDays}</td></tr>
    </table>
    <p><a href="${escapeHtml(data.requestUrl)}">View request</a></p>
  `.trim();
  const textBody = `Hi ${data.employeeFirstName},\n\nYour leave request has been submitted.\n\nType: ${data.leaveTypeName}\nStart: ${data.startDate}\nEnd: ${data.endDate}\nWorking days: ${data.workingDays}\n\nView: ${data.requestUrl}`;

  return { subject, htmlBody, textBody };
}

export function renderApproved(data: ApprovedTemplateData): RenderedEmail {
  const subject = `Leave request approved — ${data.leaveTypeName}`;
  const htmlBody = `
    <h1>Hi ${escapeHtml(data.employeeFirstName)},</h1>
    <p>Your leave request has been <strong>approved</strong> by ${escapeHtml(data.approverName)}.</p>
    <table>
      <tr><td><strong>Type</strong></td><td>${escapeHtml(data.leaveTypeName)}</td></tr>
      <tr><td><strong>Start</strong></td><td>${escapeHtml(data.startDate)}</td></tr>
      <tr><td><strong>End</strong></td><td>${escapeHtml(data.endDate)}</td></tr>
      <tr><td><strong>Working days</strong></td><td>${data.workingDays}</td></tr>
    </table>
    <p><a href="${escapeHtml(data.dashboardUrl)}">View dashboard</a></p>
  `.trim();
  const textBody = `Hi ${data.employeeFirstName},\n\nYour leave request has been approved by ${data.approverName}.\n\nType: ${data.leaveTypeName}\nStart: ${data.startDate}\nEnd: ${data.endDate}\nWorking days: ${data.workingDays}\n\nDashboard: ${data.dashboardUrl}`;

  return { subject, htmlBody, textBody };
}

export function renderRejected(data: RejectedTemplateData): RenderedEmail {
  const subject = `Leave request declined — ${data.leaveTypeName}`;
  const reasonLine = data.reason !== null ? `\n\nReason: ${data.reason}` : "";
  const htmlBody = `
    <h1>Hi ${escapeHtml(data.employeeFirstName)},</h1>
    <p>Unfortunately, your leave request has been <strong>declined</strong>.</p>
    <table>
      <tr><td><strong>Type</strong></td><td>${escapeHtml(data.leaveTypeName)}</td></tr>
      <tr><td><strong>Start</strong></td><td>${escapeHtml(data.startDate)}</td></tr>
      <tr><td><strong>End</strong></td><td>${escapeHtml(data.endDate)}</td></tr>
      ${data.reason !== null ? `<tr><td><strong>Reason</strong></td><td>${escapeHtml(data.reason)}</td></tr>` : ""}
    </table>
    <p><a href="${escapeHtml(data.dashboardUrl)}">View dashboard</a></p>
  `.trim();
  const textBody = `Hi ${data.employeeFirstName},\n\nYour leave request has been declined.\n\nType: ${data.leaveTypeName}\nStart: ${data.startDate}\nEnd: ${data.endDate}${reasonLine}\n\nDashboard: ${data.dashboardUrl}`;

  return { subject, htmlBody, textBody };
}

export function renderReminder(data: ReminderTemplateData): RenderedEmail {
  const subject = `Reminder: Leave request pending your approval`;
  const daysAgoLabel =
    data.submittedDaysAgo === 1 ? "1 day ago" : `${data.submittedDaysAgo} days ago`;
  const htmlBody = `
    <h1>Hi ${escapeHtml(data.managerFirstName)},</h1>
    <p>A leave request from <strong>${escapeHtml(data.employeeFullName)}</strong> is awaiting your approval (submitted ${daysAgoLabel}).</p>
    <table>
      <tr><td><strong>Type</strong></td><td>${escapeHtml(data.leaveTypeName)}</td></tr>
      <tr><td><strong>Start</strong></td><td>${escapeHtml(data.startDate)}</td></tr>
      <tr><td><strong>End</strong></td><td>${escapeHtml(data.endDate)}</td></tr>
    </table>
    <p><a href="${escapeHtml(data.approvalUrl)}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Review Request</a></p>
  `.trim();
  const textBody = `Hi ${data.managerFirstName},\n\nA leave request from ${data.employeeFullName} is awaiting your approval (submitted ${daysAgoLabel}).\n\nType: ${data.leaveTypeName}\nStart: ${data.startDate}\nEnd: ${data.endDate}\n\nApprove/reject: ${data.approvalUrl}`;

  return { subject, htmlBody, textBody };
}

export function renderPasswordReset(
  data: PasswordResetTemplateData
): RenderedEmail {
  const subject = "Reset your LeaveFlow password";
  const htmlBody = `
    <h1>Hi ${escapeHtml(data.firstName)},</h1>
    <p>We received a request to reset your password.</p>
    <p><a href="${escapeHtml(data.resetUrl)}" style="background:#6366f1;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
    <p>This link expires in ${data.expiresInMinutes} minute${data.expiresInMinutes !== 1 ? "s" : ""}.</p>
    <p>If you did not request a password reset, you can safely ignore this email.</p>
  `.trim();
  const textBody = `Hi ${data.firstName},\n\nReset your password: ${data.resetUrl}\n\nThis link expires in ${data.expiresInMinutes} minute(s).\n\nIf you did not request this, ignore this email.`;

  return { subject, htmlBody, textBody };
}

// ----------------------------------------------------------------
// Utilities
// ----------------------------------------------------------------

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
