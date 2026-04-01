import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OnboardingProgress } from '../OnboardingProgress'

describe('OnboardingProgress', () => {
  it('shows step text in "Step X / Y" format', () => {
    render(<OnboardingProgress currentStep={1} totalSteps={4} />)
    expect(screen.getByText('Step 1 / 4')).toBeInTheDocument()
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
