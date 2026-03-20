"use client";

/**
 * WizardNav — Back / Continue / Skip buttons for the onboarding wizard.
 * Also shows a numeric step indicator.
 */

import { cn } from "@/lib/utils";

interface WizardNavProps {
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly canGoBack: boolean;
  readonly skippable: boolean;
  readonly saving: boolean;
  readonly onBack: () => void;
  readonly onContinue: () => void;
  readonly onSkip: () => void;
}

export function WizardNav({
  currentStep,
  totalSteps,
  canGoBack,
  skippable,
  saving,
  onBack,
  onContinue,
  onSkip,
}: WizardNavProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between border-t border-white/5 pt-6">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        disabled={!canGoBack || saving}
        className={cn(
          "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-400",
          canGoBack && !saving
            ? "text-text-secondary hover:bg-white/5 hover:text-text-primary"
            : "cursor-not-allowed text-text-tertiary opacity-40"
        )}
        aria-label="Go to previous step"
      >
        <svg
          viewBox="0 0 16 16"
          fill="none"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back
      </button>

      {/* Step indicator dots */}
      <div
        className="flex items-center gap-1.5"
        role="status"
        aria-label={`Step ${currentStep} of ${totalSteps}`}
      >
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={cn(
              "rounded-full transition-all duration-400",
              i + 1 === currentStep
                ? "h-2 w-6 bg-accent-indigo"
                : i + 1 < currentStep
                ? "h-2 w-2 bg-accent-emerald"
                : "h-2 w-2 bg-white/10"
            )}
            aria-hidden="true"
          />
        ))}
      </div>

      {/* Right side: Skip + Continue */}
      <div className="flex items-center gap-3">
        {skippable && (
          <button
            type="button"
            onClick={onSkip}
            disabled={saving}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-text-tertiary transition-colors duration-400 hover:text-text-secondary disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Skip this step"
          >
            Skip
          </button>
        )}

        <button
          type="button"
          onClick={onContinue}
          disabled={saving}
          className={cn(
            "flex items-center gap-2 rounded-xl bg-accent-indigo px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_16px_rgba(129,140,248,0.4)] transition-all duration-400",
            saving
              ? "cursor-not-allowed opacity-60"
              : "hover:bg-[#6366F1] hover:shadow-[0_0_24px_rgba(129,140,248,0.6)]"
          )}
          aria-label={
            currentStep === totalSteps ? "Finish setup" : "Continue to next step"
          }
        >
          {saving ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeOpacity="0.3"
                />
                <path
                  d="M12 2a10 10 0 0 1 10 10"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Saving...
            </>
          ) : currentStep === totalSteps ? (
            "Finish"
          ) : (
            <>
              Continue
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path
                  d="M6 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
