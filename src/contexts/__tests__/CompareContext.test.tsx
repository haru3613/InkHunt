import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, render, screen } from '@testing-library/react'
import React from 'react'
import { CompareProvider, useCompare } from '../CompareContext'

const mockCompareList = {
  artists: [],
  addArtist: vi.fn(),
  removeArtist: vi.fn(),
  clearAll: vi.fn(),
  isInList: vi.fn(),
}

vi.mock('@/hooks/useCompareList', () => ({
  useCompareList: () => mockCompareList,
}))

describe('CompareContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useCompare', () => {
    it('throws when used outside CompareProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      expect(() => renderHook(() => useCompare())).toThrow(
        'useCompare must be used within CompareProvider'
      )
      consoleSpy.mockRestore()
    })

    it('returns the compare list value when inside CompareProvider', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <CompareProvider>{children}</CompareProvider>
      )
      const { result } = renderHook(() => useCompare(), { wrapper })

      expect(result.current).toEqual(mockCompareList)
    })
  })

  describe('CompareProvider', () => {
    it('renders its children', () => {
      render(
        <CompareProvider>
          <span>child content</span>
        </CompareProvider>
      )

      expect(screen.getByText('child content')).toBeInTheDocument()
    })
  })
})
