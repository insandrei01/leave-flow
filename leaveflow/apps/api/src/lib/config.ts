/**
 * Application configuration loaded from environment variables.
 * All required variables are validated at startup — the app will crash
 * with a clear error if any required variable is missing.
 */

export interface FirebaseConfig {
  readonly projectId: string;
  readonly clientEmail: string;
  readonly privateKey: string;
}

export interface SlackConfig {
  readonly signingSecret: string | undefined;
  readonly botToken: string | undefined;
  readonly appToken: string | undefined;
}

export interface TeamsConfig {
  readonly appId: string | undefined;
  readonly appPassword: string | undefined;
}

export interface StripeConfig {
  readonly secretKey: string | undefined;
  readonly webhookSecret: string | undefined;
  readonly publishableKey: string | undefined;
}

export interface PostmarkConfig {
  readonly serverToken: string | undefined;
  readonly fromEmail: string | undefined;
}

export interface AppConfig {
  readonly nodeEnv: string;
  readonly apiPort: number;
  readonly mongodbUri: string;
  readonly redisUrl: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly tokenEncryptionKey: string;
  readonly firebase: FirebaseConfig;
  readonly slack: SlackConfig;
  readonly teams: TeamsConfig;
  readonly stripe: StripeConfig;
  readonly postmark: PostmarkConfig;
}

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optionalEnv(key: string): string | undefined {
  return process.env[key] ?? undefined;
}

function parsePort(raw: string | undefined, defaultPort: number): number {
  if (raw === undefined || raw === "") {
    return defaultPort;
  }
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(
      `Invalid API_PORT value "${raw}": must be a number between 1 and 65535`
    );
  }
  return parsed;
}

function parseCorsOrigins(raw: string | undefined): readonly string[] {
  if (raw === undefined || raw === "") {
    return ["http://localhost:3000"];
  }
  return raw.split(",").map((origin) => origin.trim());
}

/**
 * Validates that all required environment variables are present.
 * Throws a clear error listing all missing variables at once.
 */
export function validateRequiredEnvVars(): void {
  const required = [
    "MONGODB_URI",
    "REDIS_URL",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_CLIENT_EMAIL",
    "FIREBASE_PRIVATE_KEY",
    "TOKEN_ENCRYPTION_KEY",
  ];

  const missing = required.filter(
    (key) => process.env[key] === undefined || process.env[key] === ""
  );

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables at startup:\n${missing.map((k) => `  - ${k}`).join("\n")}`
    );
  }
}

/**
 * Loads and validates configuration from environment variables.
 * Call this once at startup. Throws on missing required variables.
 */
export function loadConfig(): AppConfig {
  return Object.freeze({
    nodeEnv: process.env["NODE_ENV"] ?? "development",
    apiPort: parsePort(process.env["API_PORT"], 3000),
    mongodbUri: requireEnv("MONGODB_URI"),
    redisUrl: requireEnv("REDIS_URL"),
    corsAllowedOrigins: parseCorsOrigins(optionalEnv("CORS_ALLOWED_ORIGINS")),
    tokenEncryptionKey: requireEnv("TOKEN_ENCRYPTION_KEY"),
    firebase: Object.freeze({
      projectId: requireEnv("FIREBASE_PROJECT_ID"),
      clientEmail: requireEnv("FIREBASE_CLIENT_EMAIL"),
      privateKey: requireEnv("FIREBASE_PRIVATE_KEY"),
    }),
    slack: Object.freeze({
      signingSecret: optionalEnv("SLACK_SIGNING_SECRET"),
      botToken: optionalEnv("SLACK_BOT_TOKEN"),
      appToken: optionalEnv("SLACK_APP_TOKEN"),
    }),
    teams: Object.freeze({
      appId: optionalEnv("TEAMS_APP_ID"),
      appPassword: optionalEnv("TEAMS_APP_PASSWORD"),
    }),
    stripe: Object.freeze({
      secretKey: optionalEnv("STRIPE_SECRET_KEY"),
      webhookSecret: optionalEnv("STRIPE_WEBHOOK_SECRET"),
      publishableKey: optionalEnv("STRIPE_PUBLISHABLE_KEY"),
    }),
    postmark: Object.freeze({
      serverToken: optionalEnv("POSTMARK_SERVER_TOKEN"),
      fromEmail: optionalEnv("POSTMARK_FROM_EMAIL"),
    }),
  });
}
