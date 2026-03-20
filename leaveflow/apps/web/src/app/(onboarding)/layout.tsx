/**
 * Onboarding layout — minimal, no sidebar, centered content with gradient mesh.
 * Applied to all routes in the (onboarding) route group.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Setup",
    template: "%s | LeaveFlow Setup",
  },
};

interface OnboardingLayoutProps {
  readonly children: React.ReactNode;
}

export default function OnboardingLayout({ children }: OnboardingLayoutProps) {
  return (
    <div className="gradient-mesh min-h-screen bg-surface-primary">
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
