// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter } from '@/i18n/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function OnboardingComplete() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center space-y-6 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#53614A]/40 bg-[#53614A]/10">
        <Check aria-hidden="true" className="size-7" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#20241F]">申請已送出</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          感謝你的申請！我們會確認你的資料與作品。
          <br />
          你可以回到刺青師入口查看審核進度。
        </p>
      </div>

      <p className="text-sm text-muted-foreground">審核通過前不會公開接案；目前尚無固定審核時程，請回到這裡查看進度。</p>
      <Button onClick={() => router.replace('/artist')} className="min-h-11 w-full">查看審核進度</Button>
      <div className="flex w-full flex-col gap-3 pt-2">
        <Button
          onClick={() => router.replace('/artist/portfolio')}
          className="h-11 w-full rounded-lg bg-[#53614A] text-[#F7F6F2] font-semibold hover:bg-[#53614A]/90"
        >
          繼續上傳作品
        </Button>
        <Button
          onClick={() => router.replace('/')}
          variant="outline"
          className="h-11 w-full rounded-lg border-[#DEDFD7] bg-transparent text-muted-foreground hover:bg-[#FFFFFF] hover:text-[#20241F]"
        >
          回首頁
        </Button>
      </div>
    </div>
  )
}
