import { STATUS_COLORS } from '@/types/admin'

export function RejectedScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#f87171]/30 ${STATUS_COLORS.suspended.bg}`}>
          <span className={`text-2xl font-bold ${STATUS_COLORS.suspended.text}`}>!</span>
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F0EB]">
            審核未通過
          </h1>
          <p className="text-sm leading-relaxed text-[#F5F0EB]/60">
            你可以先更新作品集與個人資料，準備好後再重新送審。
          </p>
        </div>

        <div className="rounded-lg border border-[#1F1F1F] bg-[#141414] p-4 text-left">
          <p className="text-sm font-semibold text-[#F5F0EB]">下一步</p>
          <p className="mt-1 text-sm leading-relaxed text-[#F5F0EB]/60">
            請透過 LINE 或原本的聯繫管道告訴我們你已完成修改，我們會協助重新送審。
          </p>
        </div>
      </div>
    </div>
  )
}
