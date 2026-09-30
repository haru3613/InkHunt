interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#20241F]/40 tracking-widest uppercase">
          Step {currentStep} / {totalSteps}
        </span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#DEDFD7]">
        <div
          className="h-full rounded-full bg-[#53614A] transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}
