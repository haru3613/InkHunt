'use client'

import { Check, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AddToCompareButtonProps {
  readonly isAdded: boolean
  readonly isFull: boolean
  readonly onToggle: () => void
}

export function AddToCompareButton({ isAdded, isFull, onToggle }: AddToCompareButtonProps) {
  const t = useTranslations('compare')

  const isDisabled = isFull && !isAdded

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onToggle}
      disabled={isDisabled}
      className={cn(
        'gap-1.5',
        isAdded && 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary',
        !isAdded && !isDisabled && 'text-muted-foreground hover:text-foreground',
        isDisabled && 'text-muted-foreground opacity-40',
      )}
      aria-pressed={isAdded}
    >
      {isAdded ? (
        <Check className="size-4" aria-hidden="true" />
      ) : (
        <Plus className="size-4" aria-hidden="true" />
      )}
      {isAdded ? t('added') : t('addToCompare')}
    </Button>
  )
}
