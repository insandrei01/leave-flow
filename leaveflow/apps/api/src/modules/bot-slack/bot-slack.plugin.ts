/**
 * Slack Bot Fastify plugin — registers webhook routes.
 *
 * Routes:
 *   POST /slack/events        — Slack Events API (challenge + event dispatch)
 *   POST /slack/interactions  — Interactive components (modals, buttons)
 *   POST /slack/commands      — Slash commands
 *
 * All requests are signature-verified before processing.
 * Signatures use HMAC-SHA256 with SLACK_SIGNING_SECRET.
 */

import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import crypto from "crypto";
import { SlackBotAdapter } from "./bot-slack.adapter.js";
import { BotMappingService } from "../bot-adapter/bot-mapping.service.js";
import { handleLeaveCommand, type SlackCommandsDeps } from "./bot-slack.commands.js";
import {
  handleLeaveFormSubmission,
  handleApproveAction,
  handleRejectAction,
  handleRejectReasonSubmission,
  type SlackInteractionsDeps,
} from "./bot-slack.interactions.js";

// ----------------------------------------------------------------
// Plugin options
// ----------------------------------------------------------------

export interface SlackPluginOptions extends FastifyPluginOptions {
  readonly signingSecret: string;
  readonly adapter: SlackBotAdapter;
  readonly commandsDeps: SlackCommandsDeps;
  readonly interactionsDeps: SlackInteractionsDeps;
}

// ----------------------------------------------------------------
// Signature verification
// ----------------------------------------------------------------

function verifySlackSignature(
  signingSecret: string,
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(timestamp, 10);

  // Reject requests older than 5 minutes
  if (Math.abs(now - ts) > 300) {
    return false;
  }

  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret);
  hmac.update(baseString);
  const computed = `v0=${hmac.digest("hex")}`;

  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

// ----------------------------------------------------------------
// Slack plugin
// ----------------------------------------------------------------

async function slackBotPlugin(
  fastify: FastifyInstance,
  options: SlackPluginOptions
): Promise<void> {
  const { signingSecret, commandsDeps, interactionsDeps } = options;

  // ----------------------------------------------------------------
  // POST /slack/events — Events API
  // ----------------------------------------------------------------

  fastify.post(
    "/slack/events",
    { config: { rawBody: true } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
      const timestamp = String(req.headers["x-slack-request-timestamp"] ?? "");
      const signature = String(req.headers["x-slack-signature"] ?? "");

      if (!verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      const body = req.body as Record<string, unknown>;

      // URL verification challenge
      if (body["type"] === "url_verification") {
        return reply.send({ challenge: body["challenge"] });
      }

      // Acknowledge immediately — Slack requires 3-second response
      void reply.code(200).send();

      // Process event asynchronously
      const event = body["event"] as Record<string, unknown> | undefined;
      if (event !== undefined) {
        fastify.log.info({ event: event["type"] }, "Slack event received");
      }
    }
  );

  // ----------------------------------------------------------------
  // POST /slack/interactions — Interactive components
  // ----------------------------------------------------------------

  fastify.post(
    "/slack/interactions",
    { config: { rawBody: true } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
      const timestamp = String(req.headers["x-slack-request-timestamp"] ?? "");
      const signature = String(req.headers["x-slack-signature"] ?? "");

      if (!verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      // Acknowledge immediately
      void reply.code(200).send();

      const formBody = req.body as Record<string, unknown>;
      const payloadStr = formBody["payload"] as string | undefined;

      if (payloadStr === undefined) {
        fastify.log.warn("Slack interaction received without payload");
        return;
      }

      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadStr) as Record<string, unknown>;
      } catch {
        fastify.log.error("Failed to parse Slack interaction payload");
        return;
      }

      const type = payload["type"] as string;
      const callbackId =
        (payload["view"] as Record<string, unknown> | undefined)?.["callback_id"] as
          | string
          | undefined;

      if (type === "view_submission") {
        if (callbackId === "leave_request_form") {
          await handleLeaveFormSubmission(
            payload as Parameters<typeof handleLeaveFormSubmission>[0],
            interactionsDeps
          ).catch((err: unknown) => {
            fastify.log.error({ err }, "Error processing leave form submission");
          });
        } else if (callbackId === "reject_reason_form") {
          await handleRejectReasonSubmission(
            payload as Parameters<typeof handleRejectReasonSubmission>[0],
            interactionsDeps
          ).catch((err: unknown) => {
            fastify.log.error({ err }, "Error processing reject reason submission");
          });
        }
        return;
      }

      if (type === "block_actions") {
        const actions = (payload["actions"] as Array<Record<string, unknown>>) ?? [];
        const actionId = actions[0]?.["action_id"] as string | undefined;

        if (actionId === "approve_request") {
          await handleApproveAction(
            payload as Parameters<typeof handleApproveAction>[0],
            interactionsDeps
          ).catch((err: unknown) => {
            fastify.log.error({ err }, "Error processing approve action");
          });
        } else if (actionId === "reject_request") {
          await handleRejectAction(
            payload as Parameters<typeof handleRejectAction>[0],
            interactionsDeps
          ).catch((err: unknown) => {
            fastify.log.error({ err }, "Error processing reject action");
          });
        }
      }
    }
  );

  // ----------------------------------------------------------------
  // POST /slack/commands — Slash commands
  // ----------------------------------------------------------------

  fastify.post(
    "/slack/commands",
    { config: { rawBody: true } },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const rawBody = (req as FastifyRequest & { rawBody?: string }).rawBody ?? "";
      const timestamp = String(req.headers["x-slack-request-timestamp"] ?? "");
      const signature = String(req.headers["x-slack-signature"] ?? "");

      if (!verifySlackSignature(signingSecret, rawBody, timestamp, signature)) {
        return reply.code(401).send({ error: "Invalid signature" });
      }

      // Acknowledge immediately
      void reply.code(200).send();

      const body = req.body as Record<string, string>;

      await handleLeaveCommand(
        {
          command: body["command"] ?? "",
          text: body["text"] ?? "",
          user_id: body["user_id"] ?? "",
          channel_id: body["channel_id"] ?? "",
          trigger_id: body["trigger_id"] ?? "",
          team_id: body["team_id"] ?? "",
        },
        commandsDeps
      ).catch((err: unknown) => {
        fastify.log.error({ err }, "Error handling Slack command");
      });
    }
  );
}

export const slackBotPlugin = fp(slackBotPlugin, {
  name: "slack-bot",
  fastify: "5.x",
});
