/**
 * JourneyTimeline — package-tracking style container for the approval journey.
 *
 * Composes JourneyStep items into a vertical timeline.
 */

import { cn } from "@/lib/utils";
import { JourneyStep, type JourneyStepData } from "./journey-step";

/* =========================================================================
   Types
   ========================================================================= */

export interface JourneyTimelineProps {
  readonly steps: readonly JourneyStepData[];
  readonly className?: string;
}

/* =========================================================================
   Component
   ========================================================================= */

export function JourneyTimeline({ steps, className }: JourneyTimelineProps) {
  if (steps.length === 0) return null;

  return (
    <div
      role="list"
      aria-label="Approval journey"
      className={cn("relative", className)}
    >
      {steps.map((step, index) => (
        <JourneyStep
          key={step.id}
          step={step}
          isLast={index === steps.length - 1}
        />
      ))}
    </div>
  );
}
