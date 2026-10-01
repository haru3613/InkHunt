interface OnboardingProgressProps {
  currentStep: number
  totalSteps: number
}

const STEP_NAMES = ['基本資料', '刺青風格', '價格與地區', '作品與送出']

export function OnboardingProgress({
  currentStep,
  totalSteps,
}: OnboardingProgressProps) {
  const safeCurrentStep = Math.min(Math.max(currentStep, 1), totalSteps)
  const currentStepName = STEP_NAMES[safeCurrentStep - 1] ?? `步驟 ${safeCurrentStep}`
  return (
    <nav className="w-full space-y-3" aria-label="刺青師入駐進度">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#20241F]/40 tracking-widest uppercase" aria-live="polite">
          Step {currentStep} / {totalSteps}
          <span className="sr-only">，目前為{currentStepName}</span>
        </span>
      </div>
      <ol className="grid grid-cols-4 gap-1" aria-label={`共 ${totalSteps} 個步驟，目前為第 ${safeCurrentStep} 步：${currentStepName}`}>
        {STEP_NAMES.slice(0, totalSteps).map((name, index) => {
          const stepNumber = index + 1
          const isCurrent = stepNumber === safeCurrentStep
          const isComplete = stepNumber < safeCurrentStep
          return (
            <li key={name} aria-current={isCurrent ? 'step' : undefined} className={`min-w-0 text-center text-[11px] leading-tight ${isCurrent ? 'font-semibold text-[#53614A]' : isComplete ? 'text-[#20241F]/65' : 'text-[#20241F]/35'}`}>
              <span className="mr-1" aria-hidden="true">{isComplete ? '✓' : stepNumber}</span>
              <span>{name}</span>
            </li>
          )
        })}
      </ol>
      <div className="h-0.5 w-full overflow-hidden rounded-full bg-[#DEDFD7]" role="progressbar" aria-valuemin={1} aria-valuemax={totalSteps} aria-valuenow={safeCurrentStep} aria-valuetext={`第 ${safeCurrentStep} 步，共 ${totalSteps} 步：${currentStepName}`}>
        <div
          className="h-full rounded-full bg-[#53614A] transition-all duration-500 ease-out"
          style={{ width: `${(safeCurrentStep / totalSteps) * 100}%` }}
        />
      </div>
    </nav>
  )
}
