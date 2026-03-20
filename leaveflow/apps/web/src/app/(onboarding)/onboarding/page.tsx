"use client";

/**
 * Onboarding wizard page.
 *
 * Loads progress from API via useOnboarding, renders the current step,
 * and handles Back / Continue / Skip navigation.
 */

import { useRouter } from "next/navigation";
import { useOnboarding } from "@/hooks/use-onboarding";
import { ProgressSidebar } from "@/components/onboarding/progress-sidebar";
import { WizardNav } from "@/components/onboarding/wizard-nav";
import { StepCompany } from "@/components/onboarding/step-company";
import { StepLeaveTypes } from "@/components/onboarding/step-leave-types";
import { StepWorkflow } from "@/components/onboarding/step-workflow";
import { StepTeams } from "@/components/onboarding/step-teams";
import { StepEmployees } from "@/components/onboarding/step-employees";
import { StepHolidays } from "@/components/onboarding/step-holidays";
import type { OnboardingStep } from "@/components/onboarding/progress-sidebar";

/* =========================================================================
   Step metadata
   ========================================================================= */

const STEPS: readonly OnboardingStep[] = [
  { number: 1, label: "Company Profile", estimatedMinutes: 2, skippable: false },
  { number: 2, label: "Leave Types", estimatedMinutes: 3, skippable: false },
  { number: 3, label: "Approval Workflow", estimatedMinutes: 2, skippable: false },
  { number: 4, label: "Teams", estimatedMinutes: 3, skippable: true },
  { number: 5, label: "Employees", estimatedMinutes: 5, skippable: true },
  { number: 6, label: "Holidays", estimatedMinutes: 2, skippable: true },
];

/* =========================================================================
   Step content renderer
   ========================================================================= */

function StepContent({
  step,
  data,
  onDataChange,
}: {
  readonly step: number;
  readonly data: import("@/hooks/use-onboarding").OnboardingData;
  readonly onDataChange: (patch: Partial<import("@/hooks/use-onboarding").OnboardingData>) => void;
}): React.ReactElement {
  switch (step) {
    case 1:
      return <StepCompany data={data} onChange={onDataChange} />;
    case 2:
      return <StepLeaveTypes data={data} onChange={onDataChange} />;
    case 3:
      return <StepWorkflow data={data} onChange={onDataChange} />;
    case 4:
      return <StepTeams data={data} onChange={onDataChange} />;
    case 5:
      return <StepEmployees data={data} onChange={onDataChange} />;
    case 6:
      return <StepHolidays data={data} onChange={onDataChange} />;
    default:
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-emerald/20">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-8 w-8 text-accent-emerald"
              aria-hidden="true"
            >
              <path
                d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h2 className="font-display text-2xl font-semibold text-text-primary">
            You are all set!
          </h2>
          <p className="max-w-sm text-sm text-text-secondary">
            LeaveFlow is configured and ready to use. Your team can now
            request and manage leave.
          </p>
        </div>
      );
  }
}

/* =========================================================================
   Page
   ========================================================================= */

export default function OnboardingPage(): React.ReactElement {
  const router = useRouter();
  const { state, totalSteps, goToStep, completeStep, skipStep, updateData } =
    useOnboarding();

  const currentStepMeta = STEPS.find((s) => s.number === state.currentStep);
  const isComplete = state.currentStep > totalSteps;

  async function handleContinue(): Promise<void> {
    if (isComplete) {
      router.push("/dashboard");
      return;
    }
    await completeStep(state.currentStep, state.data);
  }

  function handleBack(): void {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  }

  function handleSkip(): void {
    skipStep(state.currentStep);
  }

  if (state.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="h-8 w-8 animate-spin text-accent-indigo"
            viewBox="0 0 24 24"
            fill="none"
            aria-label="Loading"
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
          <p className="text-sm text-text-secondary">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Progress sidebar */}
      <ProgressSidebar
        steps={STEPS}
        currentStep={state.currentStep}
        completedSteps={state.completedSteps}
      />

      {/* Vertical divider */}
      <div className="w-px self-stretch bg-white/5" aria-hidden="true" />

      {/* Main content */}
      <main className="flex flex-1 flex-col">
        <div className="mx-auto w-full max-w-xl flex-1 px-8 py-12">
          {/* Error banner */}
          {state.error && (
            <div
              className="mb-6 rounded-xl border border-accent-rose/20 bg-accent-rose/5 px-4 py-3 text-sm text-accent-rose"
              role="alert"
            >
              {state.error}
            </div>
          )}

          {/* Step content */}
          <div className="min-h-80">
            <StepContent
              step={state.currentStep}
              data={state.data}
              onDataChange={updateData}
            />
          </div>

          {/* Navigation */}
          <div className="mt-10">
            <WizardNav
              currentStep={state.currentStep}
              totalSteps={totalSteps}
              canGoBack={state.currentStep > 1 && !isComplete}
              skippable={currentStepMeta?.skippable ?? false}
              saving={state.saving}
              onBack={handleBack}
              onContinue={() => void handleContinue()}
              onSkip={handleSkip}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
