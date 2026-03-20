/**
 * Dashboard layout — sidebar navigation + main content area.
 * Applied to all routes in the (dashboard) route group.
 */

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { Sidebar } from "@/components/layout/sidebar";

export const metadata: Metadata = {
  title: {
    default: "Dashboard",
    template: "%s | LeaveFlow",
  },
};

interface DashboardLayoutProps {
  readonly children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <AppShell>
      <div className="flex h-screen overflow-hidden bg-surface-primary">
        <Sidebar />
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </AppShell>
  );
}
