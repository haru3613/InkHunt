interface AdminStatsBarProps {
  readonly counts: {
    pending: number
    active: number
    suspended: number
    total: number
  }
}

export function AdminStatsBar({ counts }: AdminStatsBarProps) {
  const stats = [
    { label: '待審核', value: counts.pending, color: 'text-[#53614A]' },
    { label: '已上線', value: counts.active, color: 'text-[#4ade80]' },
    { label: '停權', value: counts.suspended, color: 'text-[#f87171]' },
    { label: '總計', value: counts.total, color: 'text-[#20241F]' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-[#DEDFD7] bg-[#FFFFFF] px-4 py-3 text-center"
        >
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="mt-1 text-xs text-[#20241F]/40">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
