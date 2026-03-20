/**
 * Design token constants for use in JavaScript/TypeScript.
 *
 * These mirror the CSS custom properties in globals.css and the
 * Tailwind config. Use these when you need token values in JS
 * (e.g., canvas drawing, SVG attributes, dynamic styles).
 *
 * Source: worklog/runs/2026-03-16-design-leave-flow/02-design-experimental.md
 */

/* =========================================================================
   Colors
   ========================================================================= */

export const COLORS = {
  surface: {
    primary: "#0A0E1A",
    secondary: "#111827",
    overlay: "#1F2937",
    glass: "rgba(255, 255, 255, 0.04)",
  },
  accent: {
    indigo: "#818CF8",
    violet: "#A78BFA",
    emerald: "#34D399",
    amber: "#FBBF24",
    rose: "#FB7185",
    cyan: "#22D3EE",
  },
  border: {
    glass: "rgba(255, 255, 255, 0.06)",
    glassHover: "rgba(255, 255, 255, 0.10)",
  },
  text: {
    primary: "#FFFFFF",
    secondary: "#9CA3AF",
    tertiary: "#6B7280",
  },
} as const;

export type ColorToken = typeof COLORS;

/* =========================================================================
   Typography
   ========================================================================= */

export const TYPOGRAPHY = {
  fontFamily: {
    display: "var(--font-space-grotesk), system-ui, sans-serif",
    body: "var(--font-dm-sans), system-ui, sans-serif",
    mono: "var(--font-jetbrains-mono), ui-monospace, monospace",
  },
  fontSize: {
    /** Display: page titles, large numbers */
    displaySm: "28px",
    displayMd: "36px",
    displayLg: "48px",
    /** Body: descriptions, labels */
    bodySm: "13px",
    bodyMd: "14px",
    bodyLg: "16px",
    /** Mono: timestamps, IDs, badges */
    monoSm: "9px",
    monoMd: "11px",
    monoLg: "13px",
  },
  fontWeight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

/* =========================================================================
   Spacing (4px grid)
   ========================================================================= */

export const SPACING = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
} as const satisfies Record<number, string>;

/* =========================================================================
   Border Radius
   ========================================================================= */

export const BORDER_RADIUS = {
  /** Small elements: badges, inputs */
  sm: "8px",
  /** Buttons, small cards */
  md: "12px",
  /** Primary cards, containers */
  lg: "16px",
  /** Avatars, pills, full circles */
  full: "9999px",
} as const;

/* =========================================================================
   Effects
   ========================================================================= */

export const EFFECTS = {
  backdropBlur: {
    glass: "24px",
    glassSm: "12px",
    glassLg: "40px",
  },
  boxShadow: {
    /** Subtle glow on interactive elements */
    glowIndigo: "0 0 16px rgba(129, 140, 248, 0.4)",
    glowEmerald: "0 0 16px rgba(52, 211, 153, 0.4)",
    glowRose: "0 0 16px rgba(251, 113, 133, 0.4)",
  },
} as const;

/* =========================================================================
   Motion
   ========================================================================= */

export const MOTION = {
  easing: {
    spring: "cubic-bezier(0.16, 1, 0.3, 1)",
    easeOut: "ease-out",
  },
  duration: {
    /** Subtle element appearance */
    fast: 400,
    /** Sidebar, list item entrance */
    medium: 500,
    /** Card entrance, page transitions */
    slow: 600,
    /** Ambient pulse */
    ambient: 4000,
    /** Logo glow */
    glow: 2000,
    /** Shimmer loading */
    shimmer: 3000,
  },
} as const;

/* =========================================================================
   Status colors — map leave request statuses to accent colors
   ========================================================================= */

export const STATUS_COLORS = {
  approved: COLORS.accent.emerald,
  auto_approved: COLORS.accent.emerald,
  pending_approval: COLORS.accent.amber,
  pending_validation: COLORS.accent.amber,
  rejected: COLORS.accent.rose,
  cancelled: COLORS.text.tertiary,
  validation_failed: COLORS.accent.rose,
} as const;
