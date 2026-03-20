/**
 * WorkflowConnector — visual connector line between workflow nodes.
 *
 * Supports vertical and horizontal orientations.
 */

import { cn } from "@/lib/utils";

/* =========================================================================
   Types
   ========================================================================= */

export interface WorkflowConnectorProps {
  readonly orientation?: "vertical" | "horizontal";
  readonly dashed?: boolean;
  readonly length?: string;
  readonly className?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function WorkflowConnector({
  orientation = "vertical",
  dashed = false,
  length = orientation === "vertical" ? "h-8" : "w-8",
  className,
}: WorkflowConnectorProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("flex items-center justify-center", length, className)}
        aria-hidden="true"
      >
        <div
          className={cn(
            "w-0.5 h-full",
            dashed
              ? "border-l-2 border-dashed border-border-glass"
              : "bg-border-glass"
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn("flex items-center", length, className)}
      aria-hidden="true"
    >
      <div
        className={cn(
          "h-0.5 w-full",
          dashed
            ? "border-t-2 border-dashed border-border-glass"
            : "bg-border-glass"
        )}
      />
    </div>
  );
}
