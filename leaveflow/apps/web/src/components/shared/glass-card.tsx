/**
 * GlassCard — base glassmorphic container.
 *
 * Applies: dark translucent background, backdrop-blur, glass border, rounded corners.
 * All dashboard cards build on this primitive.
 */

import { cn } from "@/lib/utils";

export interface GlassCardProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** Padding preset. Defaults to "md" (p-6). Use "none" to manage padding manually. */
  readonly padding?: "none" | "sm" | "md" | "lg";
  /** When true, disables the hover background shift. */
  readonly noHover?: boolean;
  /** Additional aria role for semantic containers. */
  readonly role?: string;
  readonly "aria-label"?: string;
  readonly "aria-labelledby"?: string;
}

const PADDING_MAP = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
} as const;

export function GlassCard({
  children,
  className,
  padding = "md",
  noHover = false,
  role,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: GlassCardProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      className={cn(
        "glass-card",
        PADDING_MAP[padding],
        noHover && "hover:bg-[rgba(255,255,255,0.04)] hover:border-border-glass",
        className
      )}
    >
      {children}
    </div>
  );
}
