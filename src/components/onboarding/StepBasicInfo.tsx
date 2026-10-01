import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export interface BasicInfoData {
  display_name: string
  ig_handle: string
  bio: string
}

interface StepBasicInfoProps {
  data: BasicInfoData
  onChange: (data: BasicInfoData) => void
  onNext: () => void
}

export function StepBasicInfo({ data, onChange, onNext }: StepBasicInfoProps) {
  const isValid = data.display_name.trim().length > 0

  function handleField(field: keyof BasicInfoData, value: string) {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-[#20241F]">基本資料</h2>
        <p className="mt-1 text-sm text-[#20241F]/50">讓客人認識你的第一步</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="artist-display-name" className="block text-sm font-medium text-[#20241F]/70">
            藝名 / 名字
            <span className="ml-1 text-[#53614A]">*</span>
          </label>
          <Input
            id="artist-display-name"
            value={data.display_name}
            onChange={(e) => handleField('display_name', e.target.value)}
            placeholder="例：Ink by Ray"
            aria-describedby="artist-display-name-hint"
            aria-invalid={!isValid}
            className="h-10 border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
          />
          <p id="artist-display-name-hint" className="text-xs text-[#20241F]/45">
            此名稱會顯示在你的公開刺青師頁面。
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="artist-instagram" className="block text-sm font-medium text-[#20241F]/70">
            Instagram 帳號
            <span className="ml-1.5 text-xs text-[#20241F]/30">選填</span>
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#20241F]/30">
              @
            </span>
            <Input
              id="artist-instagram"
              value={data.ig_handle}
              onChange={(e) => handleField('ig_handle', e.target.value)}
              placeholder="your_handle"
              aria-describedby="artist-instagram-hint"
              className="h-10 border-[#DEDFD7] bg-[#FFFFFF] pl-7 text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
            />
          </div>
          <p id="artist-instagram-hint" className="text-xs text-[#20241F]/45">
            只需輸入帳號，不必輸入 @ 或連結。
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="artist-bio" className="block text-sm font-medium text-[#20241F]/70">
            簡介
            <span className="ml-1.5 text-xs text-[#20241F]/30">選填</span>
          </label>
          <Textarea
            id="artist-bio"
            value={data.bio}
            onChange={(e) => handleField('bio', e.target.value)}
            placeholder="描述你的刺青風格、理念或經歷..."
            rows={3}
            className="resize-none border-[#DEDFD7] bg-[#FFFFFF] text-[#20241F] placeholder:text-[#20241F]/25 focus-visible:border-[#53614A] focus-visible:ring-[#53614A]/20"
          />
        </div>
      </div>

      {!isValid && (
        <p id="basic-info-validation" role="status" className="text-sm text-[#20241F]/55">
          請填寫藝名或名字，才能繼續。
        </p>
      )}

      <Button
        onClick={onNext}
        disabled={!isValid}
        aria-describedby={!isValid ? 'basic-info-validation' : undefined}
        className="w-full h-11 rounded-lg bg-[#53614A] text-[#F7F6F2] font-semibold hover:bg-[#53614A]/90 disabled:opacity-40"
      >
        下一步
      </Button>
    </div>
  )
}
