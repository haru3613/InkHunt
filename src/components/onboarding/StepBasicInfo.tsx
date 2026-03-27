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
        <h2 className="text-xl font-bold text-[#F5F0EB]">基本資料</h2>
        <p className="mt-1 text-sm text-[#F5F0EB]/50">讓客人認識你的第一步</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            藝名 / 名字
            <span className="ml-1 text-[#C8A97E]">*</span>
          </label>
          <Input
            value={data.display_name}
            onChange={(e) => handleField('display_name', e.target.value)}
            placeholder="例：Ink by Ray"
            className="h-10 border-[#2A2A2A] bg-[#141414] text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            Instagram 帳號
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#F5F0EB]/30">
              @
            </span>
            <Input
              value={data.ig_handle}
              onChange={(e) => handleField('ig_handle', e.target.value)}
              placeholder="your_handle"
              className="h-10 border-[#2A2A2A] bg-[#141414] pl-7 text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-[#F5F0EB]/70">
            簡介
            <span className="ml-1.5 text-xs text-[#F5F0EB]/30">選填</span>
          </label>
          <Textarea
            value={data.bio}
            onChange={(e) => handleField('bio', e.target.value)}
            placeholder="描述你的刺青風格、理念或經歷..."
            rows={3}
            className="resize-none border-[#2A2A2A] bg-[#141414] text-[#F5F0EB] placeholder:text-[#F5F0EB]/25 focus-visible:border-[#C8A97E] focus-visible:ring-[#C8A97E]/20"
          />
        </div>
      </div>

      <Button
        onClick={onNext}
        disabled={!isValid}
        className="w-full h-11 rounded-lg bg-[#C8A97E] text-[#0A0A0A] font-semibold hover:bg-[#C8A97E]/90 disabled:opacity-40"
      >
        下一步
      </Button>
    </div>
  )
}
