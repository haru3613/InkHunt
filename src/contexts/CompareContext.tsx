'use client'
import { createContext, useContext, type ReactNode } from 'react'
import { useCompareList } from '@/hooks/useCompareList'
import type { CompareArtist } from '@/hooks/useCompareList'

type CompareContextType = ReturnType<typeof useCompareList>

const CompareContext = createContext<CompareContextType | null>(null)

export function CompareProvider({ children }: { readonly children: ReactNode }) {
  const compare = useCompareList()
  return <CompareContext.Provider value={compare}>{children}</CompareContext.Provider>
}

export function useCompare() {
  const ctx = useContext(CompareContext)
  if (!ctx) throw new Error('useCompare must be used within CompareProvider')
  return ctx
}

export type { CompareArtist }
