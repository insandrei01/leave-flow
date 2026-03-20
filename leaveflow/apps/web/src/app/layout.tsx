import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "@/components/shared/toast-provider";
import "./globals.css";

/* =========================================================================
   Font loading via next/font/google — zero layout shift, self-hosted.
   ========================================================================= */

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

/* =========================================================================
   Metadata
   ========================================================================= */

export const metadata: Metadata = {
  title: {
    default: "LeaveFlow",
    template: "%s | LeaveFlow",
  },
  description:
    "Modern leave management for action-oriented teams. Request, approve, and track time off — from Slack, Teams, or the web.",
  keywords: ["leave management", "time off", "HR", "Slack", "Teams"],
  robots: {
    index: false,
    follow: false,
  },
};

/* =========================================================================
   Root Layout
   ========================================================================= */

interface RootLayoutProps {
  readonly children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body className="gradient-mesh min-h-screen bg-surface-primary font-body text-text-primary antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
