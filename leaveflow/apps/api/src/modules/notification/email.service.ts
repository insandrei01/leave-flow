/**
 * Email service — Postmark client wrapper.
 *
 * Sends transactional emails using the Postmark API.
 * Wraps all template rendering and delivery into a single interface
 * so callers never deal with raw Postmark types.
 */

import type { PostmarkConfig } from "../../lib/config.js";
import type {
  WelcomeTemplateData,
  VerifyEmailTemplateData,
  RequestSubmittedTemplateData,
  ApprovedTemplateData,
  RejectedTemplateData,
  ReminderTemplateData,
  PasswordResetTemplateData,
} from "./email.templates.js";
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
// Postmark adapter interface (injected to allow mocking)
// ----------------------------------------------------------------

export interface PostmarkMessage {
  From: string;
  To: string;
  Subject: string;
  HtmlBody: string;
  TextBody: string;
  MessageStream: string;
}

export interface PostmarkSendResult {
  MessageID: string;
  SubmittedAt: string;
  To: string;
  ErrorCode: number;
  Message: string;
}

export interface PostmarkAdapter {
  sendEmail(message: PostmarkMessage): Promise<PostmarkSendResult>;
}

// ----------------------------------------------------------------
// Email service interface
// ----------------------------------------------------------------

export interface EmailService {
  sendWelcome(to: string, data: WelcomeTemplateData): Promise<void>;
  sendVerifyEmail(to: string, data: VerifyEmailTemplateData): Promise<void>;
  sendRequestSubmitted(
    to: string,
    data: RequestSubmittedTemplateData
  ): Promise<void>;
  sendApproved(to: string, data: ApprovedTemplateData): Promise<void>;
  sendRejected(to: string, data: RejectedTemplateData): Promise<void>;
  sendReminder(to: string, data: ReminderTemplateData): Promise<void>;
  sendPasswordReset(to: string, data: PasswordResetTemplateData): Promise<void>;
}

// ----------------------------------------------------------------
// Factory
// ----------------------------------------------------------------

export function createEmailService(deps: {
  postmark: PostmarkAdapter;
  config: Pick<PostmarkConfig, "fromEmail">;
}): EmailService {
  const { postmark, config } = deps;
  const fromEmail = config.fromEmail ?? "noreply@leaveflow.app";

  async function send(
    to: string,
    rendered: { subject: string; htmlBody: string; textBody: string }
  ): Promise<void> {
    await postmark.sendEmail({
      From: fromEmail,
      To: to,
      Subject: rendered.subject,
      HtmlBody: rendered.htmlBody,
      TextBody: rendered.textBody,
      MessageStream: "outbound",
    });
  }

  return {
    async sendWelcome(to: string, data: WelcomeTemplateData): Promise<void> {
      await send(to, renderWelcome(data));
    },

    async sendVerifyEmail(
      to: string,
      data: VerifyEmailTemplateData
    ): Promise<void> {
      await send(to, renderVerifyEmail(data));
    },

    async sendRequestSubmitted(
      to: string,
      data: RequestSubmittedTemplateData
    ): Promise<void> {
      await send(to, renderRequestSubmitted(data));
    },

    async sendApproved(to: string, data: ApprovedTemplateData): Promise<void> {
      await send(to, renderApproved(data));
    },

    async sendRejected(to: string, data: RejectedTemplateData): Promise<void> {
      await send(to, renderRejected(data));
    },

    async sendReminder(to: string, data: ReminderTemplateData): Promise<void> {
      await send(to, renderReminder(data));
    },

    async sendPasswordReset(
      to: string,
      data: PasswordResetTemplateData
    ): Promise<void> {
      await send(to, renderPasswordReset(data));
    },
  };
}

// ----------------------------------------------------------------
// Real Postmark adapter (requires POSTMARK_SERVER_TOKEN)
// ----------------------------------------------------------------

/**
 * Creates a real Postmark adapter using the Postmark REST API directly.
 * This avoids the need for the @postmark/postmark npm package.
 */
export function createPostmarkAdapter(serverToken: string): PostmarkAdapter {
  const POSTMARK_API_URL = "https://api.postmarkapp.com/email";

  return {
    async sendEmail(message: PostmarkMessage): Promise<PostmarkSendResult> {
      const response = await fetch(POSTMARK_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": serverToken,
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Postmark API error ${response.status}: ${body}`
        );
      }

      return response.json() as Promise<PostmarkSendResult>;
    },
  };
}
