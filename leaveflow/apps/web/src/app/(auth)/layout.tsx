import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Sign In",
    template: "%s | LeaveFlow",
  },
};

interface AuthLayoutProps {
  readonly children: React.ReactNode;
}

/**
 * Auth layout — centers auth forms on a dark gradient mesh background.
 * Used for /login, /register, and /verify-email routes.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="gradient-mesh relative flex min-h-screen items-center justify-center bg-surface-primary px-4 py-12">
      {/* Ambient orbs for depth */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-indigo/10 blur-[80px] animate-pulse-slow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full bg-accent-violet/8 blur-[60px] animate-pulse-slow"
        style={{ animationDelay: "2s" }}
      />

      {/* Form container */}
      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {children}
      </div>
    </div>
  );
}
