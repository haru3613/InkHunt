import { STATUS_COLORS, STATUS_LABELS, type ArtistStatus } from '@/types/admin'

interface ArtistStatusBannerProps {
  readonly status: ArtistStatus
}

export function ArtistStatusBanner({ status }: ArtistStatusBannerProps) {
  if (status === 'active') return null

  const message =
    status === 'pending'
      ? '審核中，1-2 個工作天內會透過 LINE 通知你。'
      : '帳號目前未上線，請更新作品集與個人資料後聯繫我們重新送審。'

  return (
    <div className="mb-6 rounded-lg border border-[#2A2A2A] bg-[#141414] p-4">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`}>
          {STATUS_LABELS[status]}
        </span>
        <p className="text-sm leading-relaxed text-[#F5F0EB]/70">{message}</p>
      </div>
    </div>
  )
}
