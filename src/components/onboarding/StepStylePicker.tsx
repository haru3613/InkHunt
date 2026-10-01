import { Button } from '@/components/ui/button'

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

export function onboardingStyleLabel(slug: string): string {
  return STYLE_GROUPS.flatMap(group => group.styles).find(style => style.slug === slug)?.name ?? slug
}

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
        <h2 className="text-xl font-bold text-[#20241F]">你的刺青風格</h2>
        <p id="style-selection-hint" className="mt-1 text-sm text-[#20241F]/50">
          請選擇 1 至 {MAX_STYLES} 個最能代表你的風格。
        </p>
        <p aria-live="polite" className="mt-1 text-sm font-medium text-[#53614A]">
          已選 {data.selectedSlugs.length} / {MAX_STYLES} 個
        </p>
      </div>

      <div className="space-y-6">
        {STYLE_GROUPS.map((group) => (
          <fieldset key={group.title}>
            <legend className="mb-3 text-xs font-semibold tracking-widest text-[#20241F]/40 uppercase">
              {group.title}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {group.styles.map((style) => {
                const selected = data.selectedSlugs.includes(style.slug)
                const disabled =
                  !selected && data.selectedSlugs.length >= MAX_STYLES
                return (
                  <button
                    key={style.slug}
                    type="button"
                    aria-pressed={selected}
                    aria-describedby="style-selection-hint"
                    disabled={disabled}
                    onClick={() => toggleStyle(style.slug)}
                    className={`flex min-h-14 items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      selected
                        ? 'border-[#53614A] bg-[#53614A]/10 text-[#53614A] shadow-[0_0_0_1px_#53614A]'
                        : 'border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F]/75 hover:border-[#3A3A3A] hover:text-[#20241F]'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold leading-tight">{style.name}</span>
                      <span className="block truncate text-[11px] text-[#20241F]/45">{style.nameEn}</span>
                    </span>
                    <span aria-hidden="true" className={`shrink-0 text-sm ${selected ? 'text-[#53614A]' : 'text-[#20241F]/25'}`}>
                      {selected ? '✓' : '+'}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}
      </div>

      {/* Service toggles */}
      <div className="space-y-2 overflow-hidden rounded-lg border border-[#DEDFD7] bg-[#FFFFFF] p-4">
        <p className="text-xs font-medium tracking-wide text-[#20241F]/50 uppercase mb-3">
          服務項目
        </p>
        {[
          { field: 'canCover' as const, label: '可做遮蓋（Cover Up）' },
          { field: 'acceptCustom' as const, label: '接受客製設計' },
          { field: 'hasFlashDesigns' as const, label: '有現成圖案（Flash）' },
        ].map(({ field, label }) => (
          <div
            key={field}
            className="flex min-w-0 cursor-pointer items-center justify-between gap-3 py-1"
          >
            <span id={`service-${field}`} className="min-w-0 flex-1 truncate text-sm text-[#20241F]/80">{label}</span>
            <button
              type="button"
              role="switch"
              aria-checked={data[field]}
              aria-labelledby={`service-${field}`}
              onClick={() => toggleOption(field)}
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors duration-200 ${
                data[field] ? 'bg-[#53614A]' : 'bg-[#DEDFD7]'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  data[field] ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      {!isValid && (
        <p id="style-validation" role="status" className="text-sm text-[#20241F]/55">
          請至少選擇 1 個刺青風格，才能繼續。
        </p>
      )}

      <div className="sticky bottom-0 z-10 flex gap-3 border-t border-border bg-background py-3">
        <Button
          onClick={onBack}
          variant="outline"
          className="h-11 flex-1 rounded-lg border-[#DEDFD7] bg-transparent text-[#20241F]/60 hover:bg-[#FFFFFF] hover:text-[#20241F]"
        >
          上一步
        </Button>
        <Button
          onClick={onNext}
          disabled={!isValid}
          aria-describedby={!isValid ? 'style-validation' : undefined}
          className="h-11 flex-[2] rounded-lg bg-[#53614A] text-[#F7F6F2] font-semibold hover:bg-[#53614A]/90 disabled:opacity-40"
        >
          下一步
        </Button>
      </div>
    </div>
  )
}
