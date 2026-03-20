/**
 * Bot Framework JWT validation using Node.js built-in crypto.
 *
 * Validates tokens from Microsoft Bot Framework:
 * - Fetches signing keys from the Bot Framework JWKS endpoint
 * - Verifies JWT signature using RS256
 * - Verifies aud (audience) matches the configured app ID
 * - Verifies iss (issuer) is the Bot Framework
 * - Verifies token is not expired
 *
 * JWKS is cached in-memory for JWKS_CACHE_TTL_MS to avoid per-request
 * HTTP round-trips to Microsoft's identity infrastructure.
 */

import { createVerify } from "node:crypto";
import { get as httpsGet } from "node:https";

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const BOT_FRAMEWORK_OPENID_URL =
  "https://login.botframework.com/v1/.well-known/openidconfiguration";

const EXPECTED_ISSUER = "https://api.botframework.com";

// Cache JWKS for 24 hours
const JWKS_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface JwksKey {
  readonly kid: string;
  readonly n: string;
  readonly e: string;
}

interface JwksCache {
  readonly keys: ReadonlyMap<string, JwksKey>;
  readonly fetchedAt: number;
}

interface JwtHeader {
  readonly alg: string;
  readonly kid: string;
}

interface JwtPayload {
  readonly aud?: string;
  readonly iss?: string;
  readonly exp?: number;
  readonly nbf?: number;
}

// ----------------------------------------------------------------
// JWKS cache (module-level singleton)
// ----------------------------------------------------------------

let jwksCache: JwksCache | null = null;

/**
 * Fetches a URL via HTTPS and returns the response body as a string.
 * Uses Node.js built-in https module — no external dependencies.
 */
function fetchJson(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    httpsGet(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

/**
 * Returns the JWKS key map, fetching from Microsoft if the cache has expired.
 */
async function getJwksKeys(): Promise<ReadonlyMap<string, JwksKey>> {
  const now = Date.now();

  if (jwksCache !== null && now - jwksCache.fetchedAt < JWKS_CACHE_TTL_MS) {
    return jwksCache.keys;
  }

  // Fetch OpenID config to find the JWKS URI
  const openIdRaw = await fetchJson(BOT_FRAMEWORK_OPENID_URL);
  const openIdConfig = JSON.parse(openIdRaw) as { jwks_uri?: string };

  if (typeof openIdConfig.jwks_uri !== "string") {
    throw new Error("Bot Framework OpenID config is missing jwks_uri");
  }

  // Fetch JWKS
  const jwksRaw = await fetchJson(openIdConfig.jwks_uri);
  const jwks = JSON.parse(jwksRaw) as { keys?: unknown[] };

  if (!Array.isArray(jwks.keys)) {
    throw new Error("Bot Framework JWKS response is missing keys array");
  }

  const keyMap = new Map<string, JwksKey>();
  for (const key of jwks.keys) {
    const k = key as Record<string, unknown>;
    if (
      typeof k["kid"] === "string" &&
      typeof k["n"] === "string" &&
      typeof k["e"] === "string" &&
      k["kty"] === "RSA"
    ) {
      keyMap.set(k["kid"], {
        kid: k["kid"],
        n: k["n"],
        e: k["e"],
      });
    }
  }

  jwksCache = { keys: keyMap, fetchedAt: now };
  return keyMap;
}

/**
 * Converts a base64url-encoded big-endian integer to a Buffer.
 */
function base64urlToBuffer(base64url: string): Buffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

/**
 * Builds a PEM-encoded RSA public key from JWK n and e values.
 * Uses the PKCS#1 DER encoding manually to avoid external libraries.
 */
function buildRsaPublicKeyPem(n: string, e: string): string {
  const nBuf = base64urlToBuffer(n);
  const eBuf = base64urlToBuffer(e);

  // DER-encode ASN.1 INTEGER
  function encodeInteger(buf: Buffer): Buffer {
    // Prepend 0x00 if high bit set (to keep positive)
    const value = buf[0] !== undefined && (buf[0] & 0x80) !== 0
      ? Buffer.concat([Buffer.from([0x00]), buf])
      : buf;
    return Buffer.concat([
      Buffer.from([0x02]),
      encodeDerLength(value.length),
      value,
    ]);
  }

  // DER-encode length
  function encodeDerLength(len: number): Buffer {
    if (len < 0x80) {
      return Buffer.from([len]);
    }
    if (len < 0x100) {
      return Buffer.from([0x81, len]);
    }
    return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
  }

  const nEncoded = encodeInteger(nBuf);
  const eEncoded = encodeInteger(eBuf);

  // SEQUENCE { n, e } — RSAPublicKey
  const rsaKey = Buffer.concat([
    Buffer.from([0x30]),
    encodeDerLength(nEncoded.length + eEncoded.length),
    nEncoded,
    eEncoded,
  ]);

  // SubjectPublicKeyInfo wrapping (RSA OID + BIT STRING)
  const rsaOid = Buffer.from(
    "300d06092a864886f70d0101010500",
    "hex"
  );
  const bitString = Buffer.concat([
    Buffer.from([0x03]),
    encodeDerLength(rsaKey.length + 1),
    Buffer.from([0x00]),
    rsaKey,
  ]);

  const spki = Buffer.concat([
    Buffer.from([0x30]),
    encodeDerLength(rsaOid.length + bitString.length),
    rsaOid,
    bitString,
  ]);

  const b64 = spki.toString("base64");
  const lines = b64.match(/.{1,64}/g)?.join("\n") ?? b64;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----\n`;
}

/**
 * Decodes a JWT segment (header or payload) from base64url.
 */
function decodeJwtSegment<T>(segment: string): T {
  const buf = base64urlToBuffer(segment);
  return JSON.parse(buf.toString("utf8")) as T;
}

/**
 * Validates a Bot Framework Bearer token.
 *
 * @param token    Raw JWT string (without "Bearer " prefix)
 * @param appId    Expected audience (TEAMS_APP_ID)
 * @throws         Error describing the validation failure
 */
export async function validateBotFrameworkToken(
  token: string,
  appId: string
): Promise<void> {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("JWT must have exactly three parts");
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const header = decodeJwtSegment<JwtHeader>(headerB64);
  if (header.alg !== "RS256") {
    throw new Error(`Unsupported JWT algorithm: ${header.alg}`);
  }
  if (!header.kid) {
    throw new Error("JWT header missing kid");
  }

  const payload = decodeJwtSegment<JwtPayload>(payloadB64);

  // Verify audience
  if (payload.aud !== appId) {
    throw new Error(
      `JWT audience mismatch: expected=${appId} got=${String(payload.aud)}`
    );
  }

  // Verify issuer
  if (payload.iss !== EXPECTED_ISSUER) {
    throw new Error(
      `JWT issuer mismatch: expected=${EXPECTED_ISSUER} got=${String(payload.iss)}`
    );
  }

  // Verify expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined && payload.exp < now) {
    throw new Error("JWT has expired");
  }
  if (payload.nbf !== undefined && payload.nbf > now) {
    throw new Error("JWT not yet valid (nbf)");
  }

  // Fetch signing key
  const keys = await getJwksKeys();
  const jwk = keys.get(header.kid);
  if (jwk === undefined) {
    throw new Error(`No signing key found for kid=${header.kid}`);
  }

  // Verify signature
  const pem = buildRsaPublicKeyPem(jwk.n, jwk.e);
  const signingInput = `${headerB64}.${payloadB64}`;
  const signature = base64urlToBuffer(signatureB64);

  const verifier = createVerify("RSA-SHA256");
  verifier.update(signingInput);
  const isValid = verifier.verify(pem, signature);

  if (!isValid) {
    throw new Error("JWT signature verification failed");
  }
}

/**
 * Clears the JWKS cache. Used in tests to force re-fetching.
 */
export function clearJwksCache(): void {
  jwksCache = null;
}
