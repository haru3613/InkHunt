import { Link } from '@/i18n/navigation'

interface StatCardProps {
  readonly label: string
  readonly value: string | number
  readonly highlighted?: boolean
  readonly href?: string
}

function StatCardContent({ label, value, highlighted }: Omit<StatCardProps, 'href'>) {
  return (
    <>
      <span
        className={
          highlighted
            ? 'font-display text-[32px] font-bold leading-none text-[#C8A97E]'
            : 'font-display text-[32px] font-bold leading-none text-[#F5F0EB]'
        }
      >
        {value}
      </span>
      <span className="mt-2 font-sans text-[13px] font-normal text-[#8A8A8A]">
        {label}
      </span>
    </>
  )
}

export function StatCard({ label, value, highlighted, href }: StatCardProps) {
  const baseClasses =
    'flex flex-col rounded-[12px] border border-[#2A2A2A] bg-[#141414] p-5 transition-colors duration-200'

  if (href) {
    return (
      <Link
        href={href as Parameters<typeof Link>[0]['href']}
        className={`${baseClasses} hover:bg-[#1C1C1C]`}
      >
        <StatCardContent label={label} value={value} highlighted={highlighted} />
      </Link>
    )
  }

  return (
    <div className={baseClasses}>
      <StatCardContent label={label} value={value} highlighted={highlighted} />
    </div>
  )
}
