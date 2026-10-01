import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const mockReplace = vi.fn()

// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
vi.mock('@/i18n/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace })),
}))

import { OnboardingComplete } from '../OnboardingComplete'

describe('OnboardingComplete', () => {
  it('shows the success title', () => {
    render(<OnboardingComplete />)
    expect(screen.getByText('申請已送出')).toBeInTheDocument()
  })

  it('explains where to check review progress without promising LINE delivery', () => {
    render(<OnboardingComplete />)
    expect(screen.getByText(/刺青師入口查看審核進度/)).toBeInTheDocument()
  })

  it('"繼續上傳作品" button navigates to /artist/portfolio', () => {
    render(<OnboardingComplete />)
    fireEvent.click(screen.getByRole('button', { name: '繼續上傳作品' }))
    expect(mockReplace).toHaveBeenCalledWith('/artist/portfolio')
  })

  it('"回首頁" button navigates to /', () => {
    render(<OnboardingComplete />)
    fireEvent.click(screen.getByRole('button', { name: '回首頁' }))
    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})

vi.mock('@/components/shared/LineNotificationHint', () => ({ LineNotificationHint: () => null }))
