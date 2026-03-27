import { Button } from '@/components/ui/button'
import { StyleCard } from './StyleCard'

const STYLE_GROUPS = [
  {
    id: 'popular' as const,
    title: '熱門風格',
    styles: [
      { slug: 'fine-line', name: '極簡線條', nameEn: 'Fine Line' },
      { slug: 'micro', name: '微刺青', nameEn: 'Micro Tattoo' },
      { slug: 'realism', name: '寫實', nameEn: 'Realism' },
      { slug: 'floral', name: '花卉', nameEn: 'Floral' },
      { slug: 'blackwork', name: '暗黑', nameEn: 'Blackwork' },
      { slug: 'anime', name: '漫畫/動漫', nameEn: 'Anime / Manga' },
    ],
  },
  {
    id: 'classic' as const,
    title: '經典風格',
    styles: [
      { slug: 'japanese-traditional', name: '日式傳統', nameEn: 'Japanese Traditional' },
      { slug: 'american-traditional', name: '美式傳統', nameEn: 'American Traditional' },
      { slug: 'neo-traditional', name: '新傳統', nameEn: 'Neo Traditional' },
      { slug: 'tribal', name: '部落圖騰', nameEn: 'Tribal' },
    ],
  },
  {
    id: 'artistic' as const,
    title: '藝術風格',
    styles: [
      { slug: 'watercolor', name: '水彩', nameEn: 'Watercolor' },
      { slug: 'geometric', name: '幾何', nameEn: 'Geometric' },
      { slug: 'illustrative', name: '插畫', nameEn: 'Illustrative' },
      { slug: 'dotwork', name: '點描', nameEn: 'Dotwork' },
      { slug: 'ornamental', name: '裝飾', nameEn: 'Ornamental' },
      { slug: 'abstract', name: '抽象', nameEn: 'Abstract' },
    ],
  },
  {
    id: 'special' as const,
    title: '特殊分類',
    styles: [
      { slug: 'lettering', name: '字體', nameEn: 'Lettering' },
      { slug: 'portrait', name: '肖像', nameEn: 'Portrait' },
      { slug: 'handpoke', name: '手刺', nameEn: 'Handpoke' },
      { slug: 'surrealism', name: '超現實', nameEn: 'Surrealism' },
    ],
  },
]

export interface StylePickerData {
  selectedSlugs: string[]
  canCover: boolean
  acceptCustom: boolean
  hasFlashDesigns: boolean
}

interface StepStylePickerProps {
  data: StylePickerData
  onChange: (data: StylePickerData) => void
  onNext: () => void
  onBack: () => void
}

const MAX_STYLES = 5

export function StepStylePicker({
  data,
  onChange,
  onNext,
  onBack,
}: StepStylePickerProps) {
  const isValid = data.selectedSlugs.length >= 1

  function toggleStyle(slug: string) {
    const isSelected = data.selectedSlugs.includes(slug)
    if (!isSelected && data.selectedSlugs.length >= MAX_STYLES) return

    const next = isSelected
      ? data.selectedSlugs.filter((s) => s !== slug)
      : [...data.selectedSlugs, slug]

    onChange({ ...data, selectedSlugs: next })
  }

  function toggleOption(field: keyof Omit<StylePickerData, 'selectedSlugs'>) {
    onChange({ ...data, [field]: !data[field] })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#F5F0EB]">你的刺青風格</h2>
        <p className="mt-1 text-sm text-[#F5F0EB]/50">
          最多選 {MAX_STYLES} 個，已選{' '}
          <span className="text-[#C8A97E]">{data.selectedSlugs.length}</span>
        </p>
      </div>

      <div className="space-y-6">
        {STYLE_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="mb-3 text-xs font-semibold tracking-widest text-[#F5F0EB]/40 uppercase">
              {group.title}
            </h3>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {group.styles.map((style) => {
                const selected = data.selectedSlugs.includes(style.slug)
                const disabled =
                  !selected && data.selectedSlugs.length >= MAX_STYLES
                return (
                  <div
                    key={style.slug}
                    className={disabled ? 'opacity-40' : ''}
                  >
                    <StyleCard
                      name={style.name}
                      nameEn={style.nameEn}
                      group={group.id}
                      selected={selected}
                      onToggle={() => !disabled && toggleStyle(style.slug)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Service toggles */}
      <div className="space-y-2 overflow-hidden rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
        <p className="text-xs font-medium tracking-wide text-[#F5F0EB]/50 uppercase mb-3">
          服務項目
        </p>
        {[
          { field: 'canCover' as const, label: '可做遮蓋（Cover Up）' },
          { field: 'acceptCustom' as const, label: '接受客製設計' },
          { field: 'hasFlashDesigns' as const, label: '有現成圖案（Flash）' },
        ].map(({ field, label }) => (
          <label
            key={field}
            className="flex min-w-0 cursor-pointer items-center justify-between gap-3 py-1"
          >
            <span className="min-w-0 flex-1 truncate text-sm text-[#F5F0EB]/80">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={data[field]}
              onClick={() => toggleOption(field)}
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
                data[field] ? 'bg-[#C8A97E]' : 'bg-[#2A2A2A]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  data[field] ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-11 flex-1 rounded-lg border-[#2A2A2A] bg-transparent text-[#F5F0EB]/60 hover:bg-[#141414] hover:text-[#F5F0EB]"
        >
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          className="h-11 flex-[2] rounded-lg bg-[#C8A97E] text-[#0A0A0A] font-semibold hover:bg-[#C8A97E]/90 disabled:opacity-40"
        >
          下一步
        </Button>
      </div>
    </div>
  )
}
