/**
 * Tests for AES-256-GCM encrypt/decrypt utilities.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt } from "./crypto.js";

const VALID_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

describe("encrypt", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env["TOKEN_ENCRYPTION_KEY"] = VALID_KEY;
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it("returns a non-empty string in iv:authTag:ciphertext format", () => {
    const result = encrypt("hello");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0));
  });

  it("produces different ciphertext each call (random IV)", () => {
    const a = encrypt("same-plaintext");
    const b = encrypt("same-plaintext");
    expect(a).not.toBe(b);
  });

  it("throws when TOKEN_ENCRYPTION_KEY is not set", () => {
    delete process.env["TOKEN_ENCRYPTION_KEY"];
    expect(() => encrypt("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("throws when TOKEN_ENCRYPTION_KEY is not 64 hex characters", () => {
    process.env["TOKEN_ENCRYPTION_KEY"] = "tooshort";
    expect(() => encrypt("x")).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });
});

describe("decrypt", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env["TOKEN_ENCRYPTION_KEY"] = VALID_KEY;
  });

  afterEach(() => {
    Object.keys(process.env).forEach((key) => {
      if (!(key in originalEnv)) delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
  });

  it("round-trips a plaintext string", () => {
    const plaintext = "my-super-secret-token";
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    expect(decrypt(encrypt(""))).toBe("");
  });

  it("round-trips a long token string", () => {
    const long = "x".repeat(2000);
    expect(decrypt(encrypt(long))).toBe(long);
  });

  it("throws on malformed ciphertext (wrong number of parts)", () => {
    expect(() => decrypt("onlyone")).toThrow();
    expect(() => decrypt("one:two")).toThrow();
    expect(() => decrypt("one:two:three:four")).toThrow();
  });

  it("throws when TOKEN_ENCRYPTION_KEY is not set", () => {
    const ciphertext = encrypt("data");
    delete process.env["TOKEN_ENCRYPTION_KEY"];
    expect(() => decrypt(ciphertext)).toThrow(/TOKEN_ENCRYPTION_KEY/);
  });

  it("throws on tampered ciphertext (auth tag mismatch)", () => {
    const [iv, authTag, ct] = encrypt("secret").split(":");
    const tampered = `${iv}:${authTag}:AAAA${ct}`;
    expect(() => decrypt(tampered)).toThrow();
  });
});
