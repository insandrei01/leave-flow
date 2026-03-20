"use client";

/**
 * Firebase client SDK initialization.
 *
 * This module is client-only (marked with "use client" at the top).
 * Do NOT import this in Server Components or API routes.
 * For server-side operations use the Firebase Admin SDK in the API app.
 *
 * Config is read from NEXT_PUBLIC_ environment variables so it is safe
 * to expose to the browser (Firebase client config is not secret).
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  connectAuthEmulator,
} from "firebase/auth";

/* =========================================================================
   Firebase client configuration
   ========================================================================= */

const firebaseConfig = {
  apiKey: process.env["NEXT_PUBLIC_FIREBASE_API_KEY"],
  authDomain: process.env["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"],
  projectId: process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"],
  storageBucket: process.env["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: process.env["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"],
  appId: process.env["NEXT_PUBLIC_FIREBASE_APP_ID"],
} as const;

/**
 * Validate that all required Firebase config values are present.
 * Fails fast in development to surface misconfiguration early.
 */
function assertFirebaseConfig(
  config: typeof firebaseConfig
): asserts config is {
  [K in keyof typeof firebaseConfig]: string;
} {
  const requiredKeys = [
    "apiKey",
    "authDomain",
    "projectId",
    "appId",
  ] as const;

  for (const key of requiredKeys) {
    if (!config[key]) {
      throw new Error(
        `Firebase config is missing required field: NEXT_PUBLIC_FIREBASE_${key
          .replace(/([A-Z])/g, "_$1")
          .toUpperCase()}. ` +
          "Set it in .env.local or your deployment environment."
      );
    }
  }
}

/* =========================================================================
   Singleton initialization
   ========================================================================= */

/**
 * Initialize or return the existing Firebase app singleton.
 * Using getApps() prevents "already initialized" errors during hot reload.
 */
function initFirebase(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  assertFirebaseConfig(firebaseConfig);
  return initializeApp(firebaseConfig);
}

/** Firebase app singleton. */
export const firebaseApp: FirebaseApp = initFirebase();

/** Firebase Auth singleton. */
export const firebaseAuth: Auth = getAuth(firebaseApp);

/* =========================================================================
   Auth emulator (development only)
   ========================================================================= */

if (
  process.env["NEXT_PUBLIC_USE_FIREBASE_EMULATOR"] === "true" &&
  process.env["NODE_ENV"] !== "production"
) {
  const emulatorHost =
    process.env["NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST"] ??
    "http://127.0.0.1:9099";

  connectAuthEmulator(firebaseAuth, emulatorHost, { disableWarnings: false });
}

/* =========================================================================
   Helper: get the current user's ID token for API requests
   ========================================================================= */

/**
 * Return a fresh Firebase ID token for the currently signed-in user.
 * Returns null if no user is signed in.
 *
 * Always fetches a fresh token (force refresh = true) to avoid sending
 * expired tokens to the API.
 */
export async function getAuthToken(): Promise<string | null> {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }
  return user.getIdToken(/* forceRefresh */ true);
}
