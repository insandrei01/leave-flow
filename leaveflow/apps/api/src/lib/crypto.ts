/**
 * AES-256-GCM symmetric encryption for storing OAuth tokens at rest.
 *
 * Reads TOKEN_ENCRYPTION_KEY from the environment (64 hex characters = 32 bytes).
 * Ciphertext format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * Each call to encrypt() generates a fresh random IV, so encrypting the same
 * plaintext twice always produces different output (IND-CPA secure).
 */

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV recommended for GCM
const AUTH_TAG_BYTES = 16; // 128-bit tag (GCM default)
const KEY_HEX_LENGTH = 64; // 32 bytes expressed as hex

function loadKey(): Buffer {
  const raw = process.env["TOKEN_ENCRYPTION_KEY"];
  if (!raw || raw.length !== KEY_HEX_LENGTH) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(raw, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a colon-separated string: base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = loadKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":");
}

/**
 * Decrypts a ciphertext produced by encrypt().
 * Throws if the format is invalid, the key is wrong, or the auth tag fails.
 */
export function decrypt(ciphertext: string): string {
  const key = loadKey();
  const parts = ciphertext.split(":");

  if (parts.length !== 3) {
    throw new Error(
      "Invalid ciphertext format: expected iv:authTag:ciphertext"
    );
  }

  const [ivB64, authTagB64, encryptedB64] = parts as [string, string, string];
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");

  if (iv.length !== IV_BYTES) {
    throw new Error("Invalid IV length in ciphertext");
  }
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error("Invalid auth tag length in ciphertext");
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString("utf8");
}
