'use client'
import { useCompare } from '@/contexts/CompareContext'
import { AddToCompareButton } from './AddToCompareButton'

interface ArtistCompareActionProps {
  readonly artist: {
    readonly id: string
    readonly display_name: string
    readonly slug: string
    readonly avatar_url: string | null
  }
}

export function ArtistCompareAction({ artist }: ArtistCompareActionProps) {
  const { has, add, remove, isFull } = useCompare()
  const isAdded = has(artist.id)

  return (
    <AddToCompareButton
      isAdded={isAdded}
      isFull={isFull}
      onToggle={() => (isAdded ? remove(artist.id) : add(artist))}
    />
  )
}
