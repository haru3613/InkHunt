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
    { label: '待審核', value: counts.pending, color: 'text-[#C8A97E]' },
    { label: '已上線', value: counts.active, color: 'text-[#4ade80]' },
    { label: '停權', value: counts.suspended, color: 'text-[#f87171]' },
    { label: '總計', value: counts.total, color: 'text-[#F5F0EB]' },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-lg border border-[#1F1F1F] bg-[#141414] px-4 py-3 text-center"
        >
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="mt-1 text-xs text-[#F5F0EB]/40">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
