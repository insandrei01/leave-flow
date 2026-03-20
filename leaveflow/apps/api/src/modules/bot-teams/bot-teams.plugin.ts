/**
 * Teams Bot Fastify plugin — registers the Bot Framework webhook route.
 *
 * Routes:
 *   POST /teams/messages — Bot Framework activities (messages, invoke)
 *
 * All activities are authenticated via Bot Framework JWT validation.
 */

import type { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { TeamsBotAdapter, TeamsConversationReference } from "./bot-teams.adapter.js";
import { handleLeaveCommand, type TeamsCommandsDeps } from "./bot-teams.commands.js";
import {
  handleLeaveFormSubmit,
  handleApproveAction,
  handleRejectAction,
  type TeamsInteractionsDeps,
} from "./bot-teams.interactions.js";
import { validateBotFrameworkToken } from "./bot-teams.jwt.js";

// ----------------------------------------------------------------
// Plugin options
// ----------------------------------------------------------------

export interface TeamsPluginOptions extends FastifyPluginOptions {
  readonly adapter: TeamsBotAdapter;
  readonly commandsDeps: TeamsCommandsDeps;
  readonly interactionsDeps: TeamsInteractionsDeps;
  /**
   * Expected Bot Framework App ID (TEAMS_APP_ID).
   * Required in production — plugin throws at registration time if missing
   * and NODE_ENV=production.
   * When undefined in non-production environments, token validation is skipped.
   */
  readonly appId?: string;
}

// ----------------------------------------------------------------
// Teams plugin
// ----------------------------------------------------------------

async function teamsBotPlugin(
  fastify: FastifyInstance,
  options: TeamsPluginOptions
): Promise<void> {
  const { commandsDeps, interactionsDeps, appId } = options;

  // Guard: TEAMS_APP_ID must be set in production to prevent unauthenticated access
  if (appId === undefined && process.env["NODE_ENV"] === "production") {
    throw new Error(
      "TEAMS_APP_ID is required in production. " +
      "Set the TEAMS_APP_ID environment variable to enable Bot Framework JWT validation."
    );
  }

  fastify.post(
    "/teams/messages",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const authHeader = req.headers["authorization"];

      // Skip JWT validation only in non-production when appId is not configured
      if (appId !== undefined) {
        if (authHeader === undefined || !authHeader.startsWith("Bearer ")) {
          return reply.code(401).send({ error: "Unauthorized" });
        }
        const token = authHeader.slice("Bearer ".length);
        try {
          await validateBotFrameworkToken(token, appId);
        } catch (err) {
          const message = err instanceof Error ? err.message : "Token validation failed";
          fastify.log.warn({ err }, `[teams-bot] JWT validation failed: ${message}`);
          return reply.code(401).send({ error: "Unauthorized" });
        }
      }

      const body = req.body as Record<string, unknown>;
      const activityType = body["type"] as string | undefined;
      const from = body["from"] as Record<string, string> | undefined;
      const serviceUrl = body["serviceUrl"] as string | undefined;
      const channelId = body["channelId"] as string | undefined;
      const conversation = body["conversation"] as Record<string, string> | undefined;

      const conversationRef: TeamsConversationReference = {
        serviceUrl: serviceUrl ?? "",
        channelId: channelId ?? "msteams",
        conversation: { id: conversation?.["id"] ?? "" },
        bot: {
          id: (body["recipient"] as Record<string, string> | undefined)?.["id"] ?? "",
          name: (body["recipient"] as Record<string, string> | undefined)?.["name"] ?? "LeaveFlow",
        },
        user: from
          ? { id: from["id"] ?? "", name: from["name"] }
          : undefined,
        activityId: body["id"] as string | undefined,
      };

      if (activityType === "message") {
        void reply.code(200).send();

        await handleLeaveCommand(
          {
            text: String(body["text"] ?? "").trim(),
            platformUserId: from?.["id"] ?? "",
            conversationId: conversation?.["id"] ?? "",
            serviceUrl: serviceUrl ?? "",
            teamsTenantId: (body["channelData"] as Record<string, Record<string, string>> | undefined)
              ?.["tenant"]?.["id"],
          },
          commandsDeps
        ).catch((err: unknown) => {
          fastify.log.error({ err }, "Error handling Teams message");
        });

        return;
      }

      if (activityType === "invoke") {
        const name = body["name"] as string | undefined;

        if (name === "adaptiveCard/action") {
          const value = body["value"] as Record<string, unknown> | undefined;
          const action = value?.["action"] as Record<string, unknown> | undefined;
          const verb = action?.["verb"] as string | undefined;
          const data = (action?.["data"] as Record<string, unknown>) ?? {};

          let invokeError: unknown;

          try {
            if (verb === "submit_leave_form") {
              await handleLeaveFormSubmit(
                {
                  verb: "submit_leave_form",
                  platformUserId: from?.["id"] ?? "",
                  data,
                  conversationRef,
                  messageId: body["replyToId"] as string | undefined,
                },
                interactionsDeps
              );
            } else if (verb === "approve") {
              await handleApproveAction(
                {
                  verb: "approve",
                  platformUserId: from?.["id"] ?? "",
                  data,
                  conversationRef,
                  messageId: body["replyToId"] as string | undefined,
                },
                interactionsDeps
              );
            } else if (verb === "reject") {
              await handleRejectAction(
                {
                  verb: "reject",
                  platformUserId: from?.["id"] ?? "",
                  data,
                  conversationRef,
                  messageId: body["replyToId"] as string | undefined,
                },
                interactionsDeps
              );
            }
          } catch (err) {
            invokeError = err;
            fastify.log.error({ err }, "Error handling Teams invoke");
          }

          if (invokeError !== undefined) {
            const msg = invokeError instanceof Error ? invokeError.message : "Error";
            return reply.code(200).send({
              statusCode: 500,
              type: "application/vnd.microsoft.error",
              value: { code: "InternalServerError", message: msg },
            });
          }

          return reply.code(200).send({
            statusCode: 200,
            type: "application/vnd.microsoft.activity.message",
            value: "OK",
          });
        }
      }

      return reply.code(200).send();
    }
  );
}

export const teamsBotPlugin = fp(teamsBotPlugin, {
  name: "teams-bot",
  fastify: "5.x",
});
