'use client'

import { CalendarClock } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'
import { addDays, getTaipeiDate } from '@/lib/artist-dashboard/dates'
import type { DashboardAppointment } from '@/types/artist-dashboard'

const timeFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
const dayFormatter = new Intl.DateTimeFormat('zh-TW', {
  timeZone: 'Asia/Taipei', month: 'long', day: 'numeric', weekday: 'long',
})

export const formatTaipeiTime = (value: string) => timeFormatter.format(new Date(value))
export const formatCalendarDate = (value: string) => dayFormatter.format(new Date(`${value}T12:00:00+08:00`))
export const inquiryHref = (id: string) => `/artist/inquiries?inquiry=${encodeURIComponent(id)}`
export const appointmentTitle = (item: DashboardAppointment) => item.bodyPart || item.description || '刺青預約'

export function AppointmentStatus({ status }: { status: DashboardAppointment['status'] }) {
  return <span className={cn('inline-flex w-fit rounded px-2 py-0.5 text-[11px] font-medium', status === 'confirmed' ? 'bg-primary/10 text-primary' : 'bg-ink-warning/10 text-ink-warning')}>
    {status === 'confirmed' ? '已確認' : '待客人確認'}
  </span>
}

interface Props {
  start: string
  today: string
  selectedDate: string
  appointments: DashboardAppointment[]
  onSelectDate: (date: string) => void
}

export function CalendarWeek({ start, today, selectedDate, appointments, onSelectDate }: Props) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index))
  const hours = appointments.map(item => Number(formatTaipeiTime(item.startsAt).split(':')[0]))
  const firstBand = Math.floor(Math.min(9, ...hours) / 3) * 3
  const lastBand = Math.floor(Math.max(21, ...hours) / 3) * 3
  const bands = Array.from({ length: (lastBand - firstBand) / 3 + 1 }, (_, index) => firstBand + index * 3)
  const groups = new Map<string, DashboardAppointment[]>()
  for (const item of appointments) {
    const key = `${getTaipeiDate(new Date(item.startsAt))}:${Math.floor(Number(formatTaipeiTime(item.startsAt).split(':')[0]) / 3) * 3}`
    groups.set(key, [...(groups.get(key) ?? []), item])
  }

  return (
    <div aria-label="每週預約行事曆">
      <div className="grid grid-cols-7 border-y border-border md:grid-cols-[48px_repeat(7,minmax(0,1fr))]">
        <div className="hidden border-r border-border/70 md:block" aria-hidden="true" />
        {days.map((day, index) => <button type="button" key={day} onClick={() => onSelectDate(day)}
          aria-label={formatCalendarDate(day)} aria-pressed={day === selectedDate} aria-current={day === today ? 'date' : undefined}
          className={cn('relative flex min-h-16 flex-col items-center justify-center gap-1 border-r border-border/70 px-1 text-sm last:border-r-0 hover:bg-muted focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]', day === selectedDate && 'bg-primary/10', day === today && 'font-semibold text-primary')}>
          <span className="tabular-nums">{Number(day.slice(5, 7))}/{Number(day.slice(8))}</span>
          <span className="text-xs text-muted-foreground"><span className="hidden sm:inline">星期</span>{['一', '二', '三', '四', '五', '六', '日'][index]}</span>
          {day === today && <span className="absolute inset-x-3 bottom-2 h-px bg-primary" aria-hidden="true" />}
        </button>)}
      </div>
      <div className="hidden md:block">
        {bands.map(hour => <div key={hour} className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-border/70 last:border-b-0">
          <div className="flex flex-col gap-0.5 border-r border-border/70 pt-3 text-[10px] tabular-nums text-muted-foreground" aria-hidden="true"><span>{String(hour).padStart(2, '0')}:00</span><span>– {String(hour + 3).padStart(2, '0')}:00</span></div>
          {days.map(day => <div key={day} className={cn('flex min-h-[84px] min-w-0 flex-col gap-2 border-r border-border/70 px-1.5 py-2 last:border-r-0', day === selectedDate && 'bg-primary/5')}>
            {(groups.get(`${day}:${hour}`) ?? []).map(item => <Link key={item.id} href={inquiryHref(item.inquiryId)}
              aria-label={`${formatCalendarDate(day)} ${formatTaipeiTime(item.startsAt)} ${appointmentTitle(item)}，${item.status === 'confirmed' ? '已確認' : '待客人確認'}，開啟詢價`}
              className="group flex min-w-0 flex-col gap-1 rounded-lg border border-border bg-card px-2 py-2 text-[13px] transition-colors hover:border-primary/50 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring">
              <div className="flex items-center gap-1.5 text-primary"><CalendarClock className="size-3.5 shrink-0" aria-hidden="true" /><time dateTime={item.startsAt} className="font-semibold tabular-nums">{formatTaipeiTime(item.startsAt)}</time></div>
              <span className="truncate font-medium" title={appointmentTitle(item)}>{appointmentTitle(item)}</span>
              <AppointmentStatus status={item.status} />
            </Link>)}
          </div>)}
        </div>)}
        <p className="mt-3 text-xs text-muted-foreground">台灣時間 · 卡片顯示開始時間，不代表服務時長</p>
      </div>
      {appointments.length === 0 && <p className="mt-4 text-sm text-muted-foreground">這週還沒有預約。客人接受報價後，就能在對話中安排時間。</p>}
    </div>
  )
}
