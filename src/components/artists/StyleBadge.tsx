import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StyleBadgeProps {
  name: string
  icon?: string | null
  slug?: string
  active?: boolean
}

export function StyleBadge({ name, icon, active = false }: StyleBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'rounded-sm bg-ink-accent-dim text-accent-foreground hover:bg-muted',
        active && 'bg-primary text-primary-foreground hover:bg-ink-accent-hover',
      )}
    >
      {icon && <span>{icon}</span>}
      {name}
    </Badge>
  )
}
