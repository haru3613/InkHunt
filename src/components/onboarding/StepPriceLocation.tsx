import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

const CITY_GROUPS = [
  {
    label: '北部',
    cities: ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣'],
  },
  {
    label: '中部',
    cities: ['苗栗縣', '台中市', '彰化縣', '南投縣', '雲林縣'],
  },
  {
    label: '南部',
    cities: ['嘉義市', '嘉義縣', '台南市', '高雄市', '屏東縣'],
  },
  {
    label: '東部',
    cities: ['宜蘭縣', '花蓮縣', '台東縣'],
  },
  {
    label: '離島',
    cities: ['澎湖縣', '金門縣', '連江縣'],
  },
]

export interface PriceLocationData {
  cities: string[]
  district: string
  price_min: string
  price_max: string
  pricing_note: string
}

interface StepPriceLocationProps {
  data: PriceLocationData
  onChange: (data: PriceLocationData) => void
  onNext: () => void
  onBack: () => void
}

export function StepPriceLocation({
  data,
  onChange,
  onNext,
  onBack,
}: StepPriceLocationProps) {
  const minValue = Number(data.price_min)
  const maxValue = Number(data.price_max)
  const hasMinimumPrice = data.price_min.trim().length > 0
  const hasMaximumPrice = data.price_max.trim().length > 0
  const isMinimumPriceValid = hasMinimumPrice && Number.isFinite(minValue) && minValue >= 0
  const isMaximumPriceValid = !hasMaximumPrice || (Number.isFinite(maxValue) && maxValue >= 0)
  const isPriceRangeValid = isMinimumPriceValid && isMaximumPriceValid && (!hasMaximumPrice || maxValue >= minValue)
  const isValid = data.cities.length > 0 && isPriceRangeValid
  const validationMessage = data.cities.length === 0
    ? '請至少選擇 1 個服務城市。'
    : !hasMinimumPrice
      ? '請填寫參考起始價格。'
      : !isMinimumPriceValid
        ? '參考起始價格必須是 0 或以上的有效數字。'
        : !isMaximumPriceValid
          ? '參考上限必須是 0 或以上的有效數字。'
          : maxValue < minValue
            ? '參考上限不能低於參考起始價格。'
            : null

  function toggleCity(city: string) {
    const next = data.cities.includes(city)
      ? data.cities.filter((c) => c !== city)
      : [...data.cities, city]
    onChange({ ...data, cities: next })
  }

  function handleField(
    field: Exclude<keyof PriceLocationData, 'cities'>,
    value: string,
  ) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#20241F]">價格與地區</h2>
        <p className="mt-1 text-sm text-[#20241F]/50">讓客人知道在哪裡找到你，以及預算範圍</p>
      </div>

      <div className="space-y-4">
        {/* Cities — multi-select grouped */}
        <fieldset className="space-y-3">
          <legend className="block text-sm font-medium text-[#20241F]/70">
            服務城市
            <span className="ml-1 text-[#53614A]">*</span>
            <span className="ml-2 text-xs text-[#20241F]/30">可複選</span>
          </legend>

          {CITY_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-xs font-medium text-[#20241F]/30 tracking-wider">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    aria-pressed={data.cities.includes(city)}
                    onClick={() => toggleCity(city)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      data.cities.includes(city)
                        ? 'border-[#53614A] bg-[#53614A]/10 text-[#53614A]'
                        : 'border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F]/60 hover:border-[#3A3A3A] hover:text-[#20241F]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </fieldset>

        {/* District */}
        <div className="space-y-1.5">
          <label htmlFor="artist-district" className="block text-sm font-medium text-[#20241F]/70">
            區域
            <span className="ml-1.5 text-xs text-[#20241F]/30">選填</span>
          </label>
          <Input
            id="artist-district"
            value={data.district}
            onChange={(e) => handleField('district', e.target.value)}
            placeholder="例：大安區、信義區"
            className="h-10 border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
          />
        </div>

        {/* Price range */}
        <div className="space-y-1.5">
          <label htmlFor="artist-price-min" className="block text-sm font-medium text-[#20241F]/70">
            參考起始價格（NT$）
            <span className="ml-1 text-[#53614A]">*</span>
          </label>
          <Input
            id="artist-price-min"
            type="number"
            min={0}
            value={data.price_min}
            onChange={(e) => handleField('price_min', e.target.value)}
            placeholder="例：2000"
            aria-describedby="artist-price-min-hint"
            aria-invalid={hasMinimumPrice && !isMinimumPriceValid}
            className="h-10 border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
          />
          <p id="artist-price-min-hint" className="text-xs text-[#20241F]/45">
            顯示給客人的最低參考費用；實際報價可依設計內容另行確認。
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="artist-price-max" className="block text-sm font-medium text-[#20241F]/70">
            參考上限（NT$）
            <span className="ml-1.5 text-xs text-[#20241F]/30">選填</span>
          </label>
          <Input
            id="artist-price-max"
            type="number"
            min={0}
            value={data.price_max}
            onChange={(e) => handleField('price_max', e.target.value)}
            placeholder="例：8000"
            aria-describedby="artist-price-max-hint"
            aria-invalid={hasMaximumPrice && (!isMaximumPriceValid || maxValue < minValue)}
            className="h-10 border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
          />
          <p id="artist-price-max-hint" className="text-xs text-[#20241F]/45">
            選填；若填寫，金額不可低於參考起始價格。
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="artist-pricing-note" className="block text-sm font-medium text-[#20241F]/70">
            收費說明
            <span className="ml-1.5 text-xs text-[#20241F]/30">選填</span>
          </label>
          <Textarea
            id="artist-pricing-note"
            value={data.pricing_note}
            onChange={(e) => handleField('pricing_note', e.target.value)}
            placeholder="例：依據尺寸及複雜度另議，實際報價面談後確認..."
            rows={2}
            className="resize-none border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
          />
        </div>
      </div>

      {validationMessage && (
        <p id="price-location-validation" role="status" className="text-sm text-[#20241F]/55">
          {validationMessage} 修正後即可繼續。
        </p>
      )}

      <div className="flex gap-3">
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
          aria-describedby={validationMessage ? 'price-location-validation' : undefined}
          className="h-11 flex-[2] rounded-lg bg-[#53614A] text-[#F7F6F2] font-semibold hover:bg-[#53614A]/90 disabled:opacity-40"
        >
          下一步
        </Button>
      </div>
    </div>
  )
}
