import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function OnboardingComplete() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center space-y-6 py-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C8A97E]/40 bg-[#C8A97E]/10">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#C8A97E"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#F5F0EB]">申請已送出</h2>
        <p className="text-sm leading-relaxed text-[#F5F0EB]/60">
          感謝你的申請！我們會在 1-2 個工作天內審核。
          <br />
          審核結果會透過 LINE 通知你。
        </p>
      </div>

      <div className="flex w-full flex-col gap-3 pt-2">
        <Button
          onClick={() => router.replace('/artist/portfolio')}
          className="h-11 w-full rounded-lg bg-[#C8A97E] text-[#0A0A0A] font-semibold hover:bg-[#C8A97E]/90"
        >
          繼續上傳作品
        </Button>
        <Button
          onClick={() => router.replace('/')}
          variant="outline"
          className="h-11 w-full rounded-lg border-[#2A2A2A] bg-transparent text-[#F5F0EB]/60 hover:bg-[#141414] hover:text-[#F5F0EB]"
        >
          回首頁
        </Button>
      </div>
    </div>
  )
}
