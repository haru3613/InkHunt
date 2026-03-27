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
  const isValid = data.cities.length > 0 && data.price_min.trim().length > 0

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
        <h2 className="text-xl font-bold text-[#F5F0EB]">價格與地區</h2>
        <p className="mt-1 text-sm text-[#F5F0EB]/50">讓客人知道在哪裡找到你，以及預算範圍</p>
      </div>

      <div className="space-y-4">
        {/* Cities — multi-select grouped */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            服務城市
            <span className="ml-1 text-[#C8A97E]">*</span>
            <span className="ml-2 text-xs text-[#F5F0EB]/30">可複選</span>
          </label>

          {CITY_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-xs font-medium text-[#F5F0EB]/30 tracking-wider">
                {group.label}
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.cities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                      data.cities.includes(city)
                        ? 'border-[#C8A97E] bg-[#C8A97E]/10 text-[#C8A97E]'
                        : 'border-[#2A2A2A] bg-[#141414] text-[#F5F0EB]/60 hover:border-[#3A3A3A] hover:text-[#F5F0EB]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* District */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            區域
            <span className="ml-1.5 text-xs text-[#F5F0EB]/30">選填</span>
          </label>
          <Input
            value={data.district}
            onChange={(e) => handleField('district', e.target.value)}
            placeholder="例：大安區、信義區"
            className="h-10 border-[#2A2A2A] bg-[#141414] text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
          />
        </div>

        {/* Price range */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            最低收費（NT$）
            <span className="ml-1 text-[#C8A97E]">*</span>
          </label>
          <Input
            type="number"
            min={0}
            value={data.price_min}
            onChange={(e) => handleField('price_min', e.target.value)}
            placeholder="例：2000"
            className="h-10 border-[#2A2A2A] bg-[#141414] text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            最高收費（NT$）
            <span className="ml-1.5 text-xs text-[#F5F0EB]/30">選填</span>
          </label>
          <Input
            type="number"
            min={0}
            value={data.price_max}
            onChange={(e) => handleField('price_max', e.target.value)}
            placeholder="例：8000"
            className="h-10 border-[#2A2A2A] bg-[#141414] text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            收費說明
            <span className="ml-1.5 text-xs text-[#F5F0EB]/30">選填</span>
          </label>
          <Textarea
            value={data.pricing_note}
            onChange={(e) => handleField('pricing_note', e.target.value)}
            placeholder="例：依據尺寸及複雜度另議，實際報價面談後確認..."
            rows={2}
            className="resize-none border-[#2A2A2A] bg-[#141414] text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
          />
        </div>
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
