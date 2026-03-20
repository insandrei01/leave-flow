import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /**
       * Design token colors from the experimental design system.
       * Source: worklog/runs/2026-03-16-design-leave-flow/02-design-experimental.md
       */
      colors: {
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
          "glass-hover": "rgba(255, 255, 255, 0.10)",
        },
        text: {
          primary: "#FFFFFF",
          secondary: "#9CA3AF",
          tertiary: "#6B7280",
        },
      },

      /**
       * Typography families.
       * Actual font loading is handled by next/font in layout.tsx.
       */
      fontFamily: {
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "ui-monospace", "monospace"],
      },

      /**
       * Border radius tokens.
       */
      borderRadius: {
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },

      /**
       * Custom backdrop blur values for glassmorphic cards.
       */
      backdropBlur: {
        glass: "24px",
        "glass-sm": "12px",
        "glass-lg": "40px",
      },

      /**
       * Motion design language — spring curves and durations.
       */
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        "400": "400ms",
        "500": "500ms",
        "600": "600ms",
      },

      /**
       * Custom animations.
       */
      keyframes: {
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-right": {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
        glow: {
          "0%, 100%": {
            boxShadow: "0 0 8px rgba(129, 140, 248, 0.4)",
          },
          "50%": {
            boxShadow: "0 0 24px rgba(129, 140, 248, 0.8)",
          },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
      animation: {
        "slide-up": "slide-up 600ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-right": "slide-right 500ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 400ms ease-out both",
        "pulse-slow": "pulse-slow 4000ms ease-in-out infinite",
        glow: "glow 2000ms ease-in-out infinite alternate",
        shimmer: "shimmer 3000ms ease-in-out infinite",
      },

      /**
       * Spacing extensions (4px grid base).
       */
      spacing: {
        "18": "72px",
        "22": "88px",
      },
    },
  },

  plugins: [],

  /**
   * Accessibility: reduced motion support is built into Tailwind
   * via the `motion-reduce:` variant.
   */
};

export default config;
