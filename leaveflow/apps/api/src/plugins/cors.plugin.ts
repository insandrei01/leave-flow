import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { loadConfig } from "../lib/config.js";

/**
 * Registers @fastify/cors with allowed origins read from config.
 * Credentials are always enabled to allow cookies / Authorization headers.
 */
async function registerCorsPlugin(app: FastifyInstance): Promise<void> {
  const config = loadConfig();
  const allowedOrigins = config.corsAllowedOrigins;

  await app.register(cors, {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g., server-to-server, curl)
      if (origin === undefined) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS policy`), false);
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
  });
}

export const corsPlugin = fp(registerCorsPlugin, {
  name: "cors-plugin",
  fastify: "5.x",
});
