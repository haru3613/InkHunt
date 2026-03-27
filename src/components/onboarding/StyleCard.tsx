import { cn } from '@/lib/utils'

type StyleGroup = 'popular' | 'classic' | 'artistic' | 'special'

interface StyleCardProps {
  name: string
  nameEn: string
  group: StyleGroup
  selected: boolean
  onToggle: () => void
}

const GROUP_GRADIENTS: Record<StyleGroup, string> = {
  popular: 'from-[#2a2520] to-[#141414]',
  classic: 'from-[#2a1f1f] to-[#141414]',
  artistic: 'from-[#1f2028] to-[#141414]',
  special: 'from-[#1f2822] to-[#141414]',
}

export function StyleCard({ name, nameEn, group, selected, onToggle }: StyleCardProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative flex aspect-[3/4] w-full flex-col items-center justify-end overflow-hidden rounded-lg border pb-3 text-center transition-all duration-150',
        `bg-gradient-to-b ${GROUP_GRADIENTS[group]}`,
        selected
          ? 'border-[#C8A97E] shadow-[0_0_0_1px_#C8A97E]'
          : 'border-[#2A2A2A] hover:border-[#3A3A3A]',
      )}
      aria-pressed={selected}
    >
      {/* Overlay gradient for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-[#0A0A0A]/20 to-transparent" />

      {/* Selected checkmark */}
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#C8A97E] text-[10px] font-bold text-[#0A0A0A]">
          &#10003;
        </span>
      )}

      {/* Labels */}
      <div className="relative z-10 space-y-0.5 px-2">
        <p className="text-sm font-semibold leading-tight text-[#F5F0EB]">{name}</p>
        <p className="text-[10px] tracking-wide text-[#F5F0EB]/40">{nameEn}</p>
      </div>
    </button>
  )
}
