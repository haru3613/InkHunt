import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingProgress } from '../OnboardingProgress'

describe('OnboardingProgress', () => {
  it('shows step text in "Step X / Y" format', () => {
    render(<OnboardingProgress currentStep={1} totalSteps={4} />)
    expect(screen.getByText('Step 1 / 4')).toBeInTheDocument()
  })

  it('shows all named steps and marks the current step accessibly', () => {
    render(<OnboardingProgress currentStep={2} totalSteps={4} />)

    expect(screen.getByText('基本資料')).toBeInTheDocument()
    expect(screen.getByText('刺青風格')).toBeInTheDocument()
    expect(screen.getByText('價格與地區')).toBeInTheDocument()
    expect(screen.getByText('作品與送出')).toBeInTheDocument()
    expect(screen.getByText('刺青風格').closest('li')).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '第 2 步，共 4 步：刺青風格')
  })

  it('sets progress bar width to 25% for step 1 of 4', () => {
    const { container } = render(<OnboardingProgress currentStep={1} totalSteps={4} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.style.width).toBe('25%')
  })

  it('sets progress bar width to 75% for step 3 of 4', () => {
    const { container } = render(<OnboardingProgress currentStep={3} totalSteps={4} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.style.width).toBe('75%')
  })

  it('sets progress bar width to 100% for the final step', () => {
    const { container } = render(<OnboardingProgress currentStep={4} totalSteps={4} />)
    const bar = container.querySelector('[style*="width"]') as HTMLElement
    expect(bar).not.toBeNull()
    expect(bar.style.width).toBe('100%')
  })
})
