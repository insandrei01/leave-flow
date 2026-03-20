"use client";

/**
 * Email verification page — displayed after registration while the user
 * waits for the Firebase verification email.
 *
 * Allows resending the verification email and polls for verification status.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendEmailVerification, reload } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import { cn } from "@/lib/utils";

const RESEND_COOLDOWN_SECONDS = 60;
const POLL_INTERVAL_MS = 3000;

export default function VerifyEmailPage() {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const email = firebaseAuth.currentUser?.email ?? "your email address";

  // Poll Firebase for email verification status
  useEffect(() => {
    const interval = setInterval(async () => {
      const user = firebaseAuth.currentUser;
      if (!user) return;

      try {
        await reload(user);
        if (user.emailVerified) {
          clearInterval(interval);
          router.push("/dashboard");
        }
      } catch {
        // Silently ignore — will retry on next interval
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async (): Promise<void> => {
    const user = firebaseAuth.currentUser;
    if (!user || cooldown > 0) return;

    setIsSending(true);
    setMessage(null);

    try {
      await sendEmailVerification(user);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage({ type: "success", text: "Verification email sent." });
    } catch {
      setMessage({ type: "error", text: "Failed to resend. Please try again." });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="glass-card p-8 text-center">
      {/* Icon */}
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-indigo/20 ring-1 ring-accent-indigo/40">
        <svg
          aria-hidden="true"
          className="h-8 w-8 text-accent-indigo"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
      </div>

      <h1 className="font-display text-2xl font-bold text-text-primary">
        Check your email
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        We sent a verification link to{" "}
        <span className="font-medium text-text-primary">{email}</span>
      </p>
      <p className="mt-1 text-sm text-text-tertiary">
        Click the link in the email to verify your account. This page will
        redirect automatically once verified.
      </p>

      {/* Pulse indicator */}
      <div className="my-6 flex items-center justify-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-indigo opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent-indigo" />
        </span>
        <span className="text-xs font-mono text-text-tertiary">
          Waiting for verification…
        </span>
      </div>

      {/* Message */}
      {message && (
        <div
          role="alert"
          className={cn(
            "mb-4 rounded-xl border px-4 py-3 text-sm",
            message.type === "success"
              ? "border-accent-emerald/30 bg-accent-emerald/10 text-accent-emerald"
              : "border-accent-rose/30 bg-accent-rose/10 text-accent-rose"
          )}
        >
          {message.text}
        </div>
      )}

      {/* Resend button */}
      <button
        type="button"
        onClick={handleResend}
        disabled={isSending || cooldown > 0}
        className={cn(
          "w-full rounded-xl border border-border-glass bg-surface-glass px-4 py-2.5",
          "text-sm font-medium text-text-secondary",
          "transition-colors duration-300 hover:border-border-glass-hover hover:text-text-primary",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {cooldown > 0
          ? `Resend in ${cooldown}s`
          : isSending
          ? "Sending…"
          : "Resend verification email"}
      </button>
    </div>
  );
}
