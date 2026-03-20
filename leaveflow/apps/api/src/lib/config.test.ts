import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset to the baseline set by test/setup.ts
    process.env["NODE_ENV"] = "test";
    process.env["API_PORT"] = "3001";
    process.env["MONGODB_URI"] = "mongodb://localhost:27017/leaveflow_test";
    process.env["REDIS_URL"] = "redis://localhost:6379";
    process.env["FIREBASE_PROJECT_ID"] = "leaveflow-test";
    process.env["FIREBASE_CLIENT_EMAIL"] = "test@leaveflow-test.iam.gserviceaccount.com";
    process.env["FIREBASE_PRIVATE_KEY"] = "test-key";
    process.env["TOKEN_ENCRYPTION_KEY"] = "a".repeat(64);
  });

  afterEach(() => {
    // Restore env to original state to avoid cross-test pollution
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.assign(process.env, originalEnv);
  });

  it("returns a valid config object when all required env vars are present", () => {
    const config = loadConfig();

    expect(config.mongodbUri).toBe("mongodb://localhost:27017/leaveflow_test");
    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.apiPort).toBe(3001);
    expect(config.nodeEnv).toBe("test");
    expect(config.firebase.projectId).toBe("leaveflow-test");
    expect(config.firebase.clientEmail).toBe(
      "test@leaveflow-test.iam.gserviceaccount.com"
    );
  });

  it("uses default port 3000 when API_PORT is not set", () => {
    delete process.env["API_PORT"];
    const config = loadConfig();
    expect(config.apiPort).toBe(3000);
  });

  it("parses corsAllowedOrigins from comma-separated string", () => {
    process.env["CORS_ALLOWED_ORIGINS"] = "http://localhost:3000,https://app.example.com";
    const config = loadConfig();
    expect(config.corsAllowedOrigins).toEqual([
      "http://localhost:3000",
      "https://app.example.com",
    ]);
  });

  it("defaults corsAllowedOrigins to localhost:3000 when not set", () => {
    delete process.env["CORS_ALLOWED_ORIGINS"];
    const config = loadConfig();
    expect(config.corsAllowedOrigins).toEqual(["http://localhost:3000"]);
  });

  it("throws when MONGODB_URI is missing", () => {
    delete process.env["MONGODB_URI"];
    expect(() => loadConfig()).toThrow(/MONGODB_URI/);
  });

  it("throws when REDIS_URL is missing", () => {
    delete process.env["REDIS_URL"];
    expect(() => loadConfig()).toThrow(/REDIS_URL/);
  });

  it("throws when FIREBASE_PROJECT_ID is missing", () => {
    delete process.env["FIREBASE_PROJECT_ID"];
    expect(() => loadConfig()).toThrow(/FIREBASE_PROJECT_ID/);
  });

  it("throws when FIREBASE_CLIENT_EMAIL is missing", () => {
    delete process.env["FIREBASE_CLIENT_EMAIL"];
    expect(() => loadConfig()).toThrow(/FIREBASE_CLIENT_EMAIL/);
  });

  it("throws when FIREBASE_PRIVATE_KEY is missing", () => {
    delete process.env["FIREBASE_PRIVATE_KEY"];
    expect(() => loadConfig()).toThrow(/FIREBASE_PRIVATE_KEY/);
  });

  it("throws when API_PORT is not a valid number", () => {
    process.env["API_PORT"] = "not-a-port";
    expect(() => loadConfig()).toThrow(/API_PORT/);
  });

  it("throws when TOKEN_ENCRYPTION_KEY is missing", () => {
    delete process.env["TOKEN_ENCRYPTION_KEY"];
    expect(() => loadConfig()).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("exposes tokenEncryptionKey from env", () => {
    const config = loadConfig();
    expect(config.tokenEncryptionKey).toBe("a".repeat(64));
  });

  it("exposes optional Slack, Teams, Stripe, Postmark as undefined when not set", () => {
    const config = loadConfig();
    expect(config.slack.signingSecret).toBeUndefined();
    expect(config.teams.appId).toBeUndefined();
    expect(config.stripe.secretKey).toBeUndefined();
    expect(config.postmark.serverToken).toBeUndefined();
  });

  it("reads optional Slack config when env vars are set", () => {
    process.env["SLACK_SIGNING_SECRET"] = "slack-secret";
    process.env["SLACK_BOT_TOKEN"] = "xoxb-token";
    const config = loadConfig();
    expect(config.slack.signingSecret).toBe("slack-secret");
    expect(config.slack.botToken).toBe("xoxb-token");
  });
});
