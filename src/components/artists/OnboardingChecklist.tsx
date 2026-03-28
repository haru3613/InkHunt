import { Link } from '@/i18n/navigation'

interface OnboardingChecklistProps {
  readonly hasProfile: boolean
  readonly portfolioCount: number
  readonly hasPricing: boolean
  readonly artistSlug?: string | null
}

const PORTFOLIO_MINIMUM = 5

interface ChecklistItemProps {
  readonly done: boolean
  readonly label: string
  readonly href?: string
}

function ChecklistItem({ done, label, href }: ChecklistItemProps) {
  const indicator = done ? '✓' : '○'

  if (done) {
    return (
      <li className="flex items-center gap-3 font-sans text-[15px] text-[#8A8A8A] line-through">
        <span className="w-4 shrink-0 text-[#8A8A8A]">{indicator}</span>
        {label}
      </li>
    )
  }

  if (href) {
    return (
      <li className="flex items-center gap-3 font-sans text-[15px] text-[#F5F0EB]">
        <span className="w-4 shrink-0 text-[#8A8A8A]">{indicator}</span>
        <Link
          href={href as Parameters<typeof Link>[0]['href']}
          className="flex items-center gap-1 hover:text-[#C8A97E] transition-colors duration-200"
        >
          {label}
          <span className="text-[#C8A97E]">→</span>
        </Link>
      </li>
    )
  }

  return (
    <li className="flex items-center gap-3 font-sans text-[15px] text-[#F5F0EB]">
      <span className="w-4 shrink-0 text-[#8A8A8A]">{indicator}</span>
      {label}
    </li>
  )
}

export function OnboardingChecklist({
  hasProfile,
  portfolioCount,
  hasPricing,
  artistSlug,
}: OnboardingChecklistProps) {
  const hasEnoughPortfolio = portfolioCount >= PORTFOLIO_MINIMUM

  return (
    <div className="mx-auto max-w-lg px-4 pt-12">
      <h1 className="font-display text-[24px] font-bold text-[#F5F0EB]">
        歡迎來到 InkHunt
      </h1>
      <p className="mt-2 font-sans text-[15px] text-[#8A8A8A]">
        完成以下步驟，讓更多客戶找到你
      </p>

      <ul className="mt-8 flex flex-col gap-4">
        <ChecklistItem
          done={hasProfile}
          label="基本資料已填寫"
          href={hasProfile ? undefined : '/artist/profile'}
        />
        <ChecklistItem
          done={hasEnoughPortfolio}
          label={`上傳至少 ${PORTFOLIO_MINIMUM} 張作品（目前 ${portfolioCount} 張）`}
          href={hasEnoughPortfolio ? undefined : '/artist/portfolio'}
        />
        <ChecklistItem
          done={hasPricing}
          label="設定價格範圍"
          href={hasPricing ? undefined : '/artist/profile'}
        />
      </ul>

      <p className="mt-8 font-sans text-[13px] text-[#555555]">
        你的檔案將在審核通過後上線
      </p>

      {artistSlug && (
        <Link
          href={`/artists/${artistSlug}` as Parameters<typeof Link>[0]['href']}
          className="mt-6 inline-flex items-center rounded-[4px] px-4 py-2 font-sans text-[14px] font-medium text-[#C8A97E] transition-colors duration-200 hover:bg-[rgba(200,169,126,0.15)]"
        >
          預覽我的 Profile
        </Link>
      )}
    </div>
  )
}
