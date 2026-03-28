'use client'
import type { ReactNode } from 'react'
import { CompareProvider, useCompare } from '@/contexts/CompareContext'
import { CompareFloatingBar } from '@/components/artists/CompareFloatingBar'

function FloatingBar() {
  const { artists, remove, clear } = useCompare()
  return <CompareFloatingBar artists={artists} onRemove={remove} onClear={clear} />
}

export function CompareWrapper({ children }: { readonly children: ReactNode }) {
  return (
    <CompareProvider>
      {children}
      <FloatingBar />
    </CompareProvider>
  )
}
