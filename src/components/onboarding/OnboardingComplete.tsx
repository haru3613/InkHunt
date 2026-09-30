// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter } from '@/i18n/navigation'
import { LineNotificationHint } from '@/components/shared/LineNotificationHint'
import { Button } from '@/components/ui/button'

export function OnboardingComplete() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center space-y-6 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#53614A]/40 bg-[#53614A]/10">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#53614A"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#20241F]">申請已送出</h2>
        <p className="text-sm leading-relaxed text-[#20241F]/60">
          感謝你的申請！我們會確認你的資料與作品。
          <br />
          你可以回到刺青師入口查看審核進度。
        </p>
      </div>

      <LineNotificationHint />
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
          className="h-11 w-full rounded-lg border-[#DEDFD7] bg-transparent text-[#20241F]/60 hover:bg-[#FFFFFF] hover:text-[#20241F]"
        >
          回首頁
        </Button>
      </div>
    </div>
  )
}
