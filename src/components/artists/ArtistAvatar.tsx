import Image from 'next/image'
import { cn } from '@/lib/utils'

const SIZES = {
  sm: { px: 40, className: 'size-10', textClass: 'text-sm font-bold' },
  md: { px: 48, className: 'size-12', textClass: 'text-lg' },
  lg: { px: 80, className: 'size-20', textClass: 'text-2xl font-bold' },
} as const

interface ArtistAvatarProps {
  readonly name: string
  readonly avatarUrl?: string | null
  readonly size?: keyof typeof SIZES
  readonly priority?: boolean
  readonly className?: string
}

export function ArtistAvatar({
  name,
  avatarUrl,
  size = 'md',
  priority = false,
  className,
}: ArtistAvatarProps) {
  const { px, className: sizeClass, textClass } = SIZES[size]

  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden rounded-full bg-stone-100',
        sizeClass,
        className,
      )}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          className="object-cover"
          sizes={`${px}px`}
          priority={priority}
        />
      ) : (
        <div
          className={cn(
            'flex size-full items-center justify-center text-stone-400',
            textClass,
          )}
        >
          {name.charAt(0)}
        </div>
      )}
    </div>
  )
}
