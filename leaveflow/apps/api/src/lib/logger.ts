import pino from "pino";

/**
 * Creates a Pino logger instance.
 * - Production / staging: JSON output (structured, machine-readable)
 * - Development / test: pretty-printed output (human-readable)
 */
export function createLogger(nodeEnv?: string): pino.Logger {
  const env = nodeEnv ?? process.env["NODE_ENV"] ?? "development";
  const isDevelopment = env === "development";

  if (isDevelopment) {
    return pino({
      level: "debug",
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
    });
  }

  return pino({
    level: env === "test" ? "silent" : "info",
  });
}

/** Singleton logger for use across the application. */
export const logger = createLogger();
