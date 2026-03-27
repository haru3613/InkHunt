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
        <span className="text-xs font-medium text-[#F5F0EB]/40 tracking-widest uppercase">
          Step {currentStep} / {totalSteps}
        </span>
      </div>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#1F1F1F]">
        <div
          className="h-full rounded-full bg-[#C8A97E] transition-all duration-500 ease-out"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  )
}
