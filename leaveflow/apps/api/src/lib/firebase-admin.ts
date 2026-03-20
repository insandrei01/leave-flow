import admin from "firebase-admin";
import { loadConfig } from "./config.js";

/**
 * Claims attached to a Firebase ID token by the backend.
 * All fields are optional on the decoded token because they may be absent
 * on newly-created accounts before onboarding completes.
 */
export interface FirebaseTokenClaims {
  readonly uid: string;
  readonly tenantId: string | undefined;
  readonly employeeId: string | undefined;
  readonly role: string | undefined;
}

let initialized = false;

/**
 * Initializes Firebase Admin SDK once using service account credentials
 * from environment config. Subsequent calls are no-ops.
 */
function ensureInitialized(): void {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const config = loadConfig();

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: config.firebase.projectId,
      clientEmail: config.firebase.clientEmail,
      // Private key in env may have literal \n — convert to real newlines
      privateKey: config.firebase.privateKey.replace(/\\n/g, "\n"),
    }),
  });

  initialized = true;
}

/**
 * Verifies a Firebase ID token and returns the decoded claims.
 * Throws if the token is invalid, expired, or cannot be verified.
 */
export async function verifyIdToken(token: string): Promise<FirebaseTokenClaims> {
  ensureInitialized();

  const decoded = await admin.auth().verifyIdToken(token);

  return Object.freeze({
    uid: decoded.uid,
    tenantId: (decoded["tenantId"] as string | undefined) ?? undefined,
    employeeId: (decoded["employeeId"] as string | undefined) ?? undefined,
    role: (decoded["role"] as string | undefined) ?? undefined,
  });
}

/**
 * Sets custom claims on a Firebase user account.
 * Claims are included in subsequent ID tokens and propagated to request.auth.
 */
export async function setCustomClaims(
  uid: string,
  claims: Record<string, unknown>
): Promise<void> {
  ensureInitialized();
  await admin.auth().setCustomUserClaims(uid, claims);
}
