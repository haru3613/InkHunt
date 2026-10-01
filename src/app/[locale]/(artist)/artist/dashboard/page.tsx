'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { ArrowRight, ArrowUpRight, CalendarDays, Check, ChevronLeft, ChevronRight, MessageSquare, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Link } from '@/i18n/navigation'
import { cn, formatRelativeTime } from '@/lib/utils'
import { addDays, getTaipeiDate, getWeekStart } from '@/lib/artist-dashboard/dates'
import { ArtistStatusBanner } from '@/components/artist/ArtistStatusBanner'
import { Button, buttonVariants } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppointmentStatus, CalendarWeek, appointmentTitle, formatCalendarDate, formatTaipeiTime, inquiryHref } from '@/components/artists/dashboard/CalendarWeek'
import type { ArtistDashboardData, DashboardPeriod } from '@/types/artist-dashboard'

const PERIODS = [{ value: '7', label: '近 7 天' }, { value: '30', label: '近 30 天' }, { value: '90', label: '近 90 天' }]
const number = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 1 })
const shortDate = (date: string) => date.slice(5).replace('-', '/')
const subscribeHydration = () => () => {}
const clientHydrated = () => true
const serverHydrated = () => false

export default function DashboardPage() {
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated)
  const { artist } = useAuth()
  const [selectedDate, setSelectedDate] = useState(() => getTaipeiDate(new Date()))
  const [period, setPeriod] = useState<DashboardPeriod>(30)
  const [data, setData] = useState<ArtistDashboardData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const weekStart = getWeekStart(selectedDate)

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const response = await fetch(`/api/artist/dashboard?date=${weekStart}&period=${period}`, { signal: controller.signal })
        if (!response.ok) throw new Error(`Dashboard unavailable (${response.status})`)
        const result: ArtistDashboardData = await response.json()
        if (!controller.signal.aborted) setData(result)
      } catch {
        if (!controller.signal.aborted) setLoadError('無法載入工作台，請檢查連線後重試。')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 0)
    return () => { window.clearTimeout(timer); controller.abort() }
  }, [weekStart, period, revision])

  const today = data?.today ?? getTaipeiDate(new Date())
  const appointments = data?.week.start === weekStart ? data.appointments : []
  const selectedAppointments = appointments.filter(item => getTaipeiDate(new Date(item.startsAt)) === selectedDate)
  const ready = data && !loading && !loadError
  const firstInquiry = data?.actionQueue[0]

  // A static server render may come from yesterday's build. Do not hydrate a
  // build-time calendar date into today's client calendar.
  if (!hydrated) return <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 lg:px-10"><CalendarLoading /></div>

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 text-foreground sm:px-8 lg:px-10">
      {artist?.status && <ArtistStatusBanner status={artist.status} />}
      <header className="flex flex-col justify-between gap-5 border-b border-border pb-5 sm:flex-row sm:items-center">
        <div>
          <p className="mb-2 text-sm tracking-[0.12em] text-muted-foreground">工作室行事曆</p>
          <h1 className="font-serif text-[30px] font-semibold leading-tight tracking-tight sm:text-[38px]">把時間留給創作。</h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">{formatCalendarDate(today)}</p>
        </div>
        <Link href={firstInquiry ? inquiryHref(firstInquiry.id) : '/artist/inquiries'} className={cn(buttonVariants({ size: 'lg' }), 'h-12 gap-3 sm:min-w-[260px]')}>
          <MessageSquare aria-hidden="true" className="size-4" />
          {ready && data.needsReplyCount > 0 ? `處理 ${data.needsReplyCount} 則待回覆` : '查看詢價對話'}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </header>
      {loadError ? (
        <div role="alert" className="my-12 flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-6">
          <p>{loadError}</p>
          <Button variant="outline" onClick={() => setRevision(value => value + 1)}><RefreshCw aria-hidden="true" />重新載入</Button>
        </div>
      ) : (
        <>
          {artist && (artist.portfolio_count ?? 0) === 0 && (
            <section aria-label="作品頁準備" className="mt-6 flex flex-col justify-between gap-3 rounded-lg border border-border bg-card px-5 py-4 sm:flex-row sm:items-center">
              <div><p className="font-medium">讓第一張作品，替你介紹自己。</p><p className="mt-1 text-sm text-muted-foreground">基本資料已填寫。上傳代表作，讓客人認識你的風格。</p></div>
              <Link href="/artist/portfolio" className={buttonVariants({ variant: 'outline' })}>上傳作品<ArrowUpRight aria-hidden="true" className="ml-2 size-4" /></Link>
            </section>
          )}
          <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:gap-10">
            <section aria-labelledby="calendar-title" aria-busy={loading} className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 id="calendar-title" className="sr-only">每週預約</h2>
                <Button variant="ghost" size="icon-lg" aria-label="上一週" onClick={() => setSelectedDate(value => addDays(value, -7))}><ChevronLeft aria-hidden="true" /></Button>
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-sm tabular-nums text-muted-foreground">{weekStart === getWeekStart(today) ? '本週' : `${weekStart.slice(0, 4)} 年`} {shortDate(weekStart)} – {shortDate(addDays(weekStart, 6))}</span>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDate(today)}>今天</Button>
                </div>
                <Button variant="ghost" size="icon-lg" aria-label="下一週" onClick={() => setSelectedDate(value => addDays(value, 7))}><ChevronRight aria-hidden="true" /></Button>
              </div>
              {loading ? <CalendarLoading /> : <CalendarWeek start={weekStart} today={today} selectedDate={selectedDate} appointments={appointments} onSelectDate={setSelectedDate} />}
            </section>
            <aside className="min-w-0 border-t border-border pt-6 lg:border-t-0 lg:border-l lg:pl-7 lg:pt-0 xl:pl-8" aria-label="當日安排與待回覆詢價">
              <div className="mb-4 flex items-center justify-between gap-1 border-b border-border pb-4">
                <h2 className="font-serif text-lg font-semibold">{formatCalendarDate(selectedDate)}</h2>
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon-sm" aria-label="前一天" onClick={() => setSelectedDate(value => addDays(value, -1))}><ChevronLeft aria-hidden="true" /></Button>
                  <Button variant="ghost" size="icon-sm" aria-label="後一天" onClick={() => setSelectedDate(value => addDays(value, 1))}><ChevronRight aria-hidden="true" /></Button>
                </div>
              </div>
              <div className="mb-3 flex items-center justify-between text-sm"><h3>{selectedDate === today ? '今日預約' : '當日預約'}</h3><span className="text-muted-foreground">{loading ? '載入中' : `${selectedAppointments.length} 場`}</span></div>
              {!loading && selectedAppointments.length === 0 && <div className="flex flex-col items-center gap-2 py-9 text-center text-sm text-muted-foreground"><CalendarDays aria-hidden="true" className="mb-1 size-6 text-primary/60" /><p>這天沒有預約安排</p><p className="text-xs">選擇其他日期，或先回覆新的詢價。</p></div>}
              <ul className="divide-y divide-border">
                {!loading && selectedAppointments.map(item => <li key={item.id}><Link href={inquiryHref(item.inquiryId)} className="group flex gap-3 py-4 focus-visible:outline-2 focus-visible:outline-ring">
                  <time dateTime={item.startsAt} className="pt-0.5 text-sm font-medium tabular-nums">{formatTaipeiTime(item.startsAt)}</time>
                  <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5"><span className="truncate text-sm font-medium group-hover:text-primary">{appointmentTitle(item)}</span><span className="text-xs text-muted-foreground">{item.consumerName ?? '客人'}</span><span className="max-w-full truncate text-xs text-muted-foreground" title={item.location}>{item.location}</span><AppointmentStatus status={item.status} /></div>
                  <ArrowUpRight aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
                </Link></li>)}
              </ul>
              <section className="mt-7 border-t border-border pt-5" aria-labelledby="reply-title">
                <div className="mb-2 flex items-baseline justify-between gap-2"><h2 id="reply-title" className="font-serif text-lg font-semibold">待回覆詢價 <span className="text-sm font-normal text-muted-foreground">{ready ? `${data.needsReplyCount} 則` : ''}</span></h2><Link href="/artist/inquiries" className="text-xs text-muted-foreground hover:text-primary">查看全部 →</Link></div>
                {ready && data.actionQueue.length === 0 && <p className="flex items-center gap-2 py-5 text-sm text-muted-foreground"><Check aria-hidden="true" className="size-4 text-primary" />目前沒有待回覆的詢價</p>}
                <ul className="divide-y divide-border">
                  {ready && data.actionQueue.slice(0, 2).map(item => <li key={item.id} className="flex items-center gap-3 py-4">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.consumerName ?? '客人'}</p><p className="mt-1 text-[11px] text-muted-foreground">{formatRelativeTime(item.waitingSince)}{item.unreadCount > 0 ? ` · ${item.unreadCount} 則未讀` : ''}</p><p className="mt-1 truncate text-xs text-muted-foreground">{item.description}</p></div>
                    <Link aria-label={`回覆 ${item.consumerName ?? '客人'} 的詢價`} href={inquiryHref(item.id)} className={buttonVariants({ size: 'sm', variant: 'secondary' })}>回覆</Link>
                  </li>)}
                </ul>
                {ready && data.needsReplyCount > 2 && <Link href="/artist/inquiries" className="mt-2 inline-flex min-h-10 items-center gap-2 text-xs text-primary">前往詢價列表<ArrowRight aria-hidden="true" className="size-3.5" /></Link>}
              </section>
            </aside>
          </div>
          <section className="mt-8 border-t border-border pt-5 lg:mt-9" aria-labelledby="performance-title" aria-busy={loading}>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3"><h2 id="performance-title" className="text-sm font-medium">接案成效</h2><Select items={PERIODS} value={String(period)} onValueChange={value => { if (value) setPeriod(Number(value) as DashboardPeriod) }}><SelectTrigger aria-label="統計期間"><SelectValue /></SelectTrigger><SelectContent><SelectGroup>{PERIODS.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectGroup></SelectContent></Select><span className="text-xs tabular-nums text-muted-foreground">{ready ? `${shortDate(data.period.start)} – ${shortDate(addDays(data.period.endExclusive, -1))}` : '更新中'}</span></div>
              <button type="button" onClick={() => setRevision(value => value + 1)} className="flex min-h-10 items-center gap-1.5 rounded px-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring" aria-label="更新工作台資料"><RefreshCw aria-hidden="true" className={cn('size-3.5', loading && 'motion-safe:animate-spin')} />更新資料</button>
            </div>
            <dl className="grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-4 lg:divide-x lg:divide-border">
              <Metric label="新增詢價" value={ready ? number.format(data.metrics.newInquiries) : '—'} unit="件" note="期間內收到的詢價" />
              <Metric label="報價接受率" value={ready && data.metrics.quoteAcceptanceRate !== null ? `${number.format(data.metrics.quoteAcceptanceRate)}%` : '—'} note={ready && data.metrics.quotedInquiries > 0 ? `${data.metrics.acceptedInquiries} / ${data.metrics.quotedInquiries} 件，${data.metrics.awaitingQuoteResponse} 件待客人回覆` : '尚無可計算的報價'} />
              <Metric label="已確認預約" value={ready ? number.format(data.metrics.confirmedAppointments) : '—'} unit="場" note="預約日期在統計期間內" />
              <Metric label="未來 7 天已確認" value={ready ? number.format(data.metrics.upcomingConfirmedAppointments) : '—'} unit="場" note="接下來的工作安排" />
            </dl>
            <details className="mt-6 text-xs leading-relaxed text-muted-foreground"><summary className="w-fit cursor-pointer rounded py-2 focus-visible:outline-2 focus-visible:outline-ring">統計怎麼算</summary><p className="max-w-3xl pt-2">詢價與報價以這段期間新增的案件計算，每個案件只算一次；等待中的報價會隨後續回覆更新。預約只計已確認、未取消的安排，並非已完成刺青或營收。日期皆為台灣時間，切換行事曆週次不會改變統計期間。</p></details>
          </section>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, unit, note }: { label: string; value: string; unit?: string; note: string }) {
  return <div className="min-w-0 lg:pl-6 lg:first:pl-0"><dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt><dd className="mt-3 flex items-baseline gap-2 font-serif text-4xl tabular-nums sm:text-5xl">{value}{unit && value !== '—' && <span className="font-sans text-sm text-muted-foreground">{unit}</span>}</dd><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">{note}</p></div>
}

function CalendarLoading() {
  return <div role="status" aria-label="正在載入行事曆" className="flex min-h-72 flex-col gap-4 rounded-lg border border-border p-5 md:min-h-[570px]"><span className="text-sm text-muted-foreground">正在載入行事曆…</span><div className="grid grid-cols-7 gap-2">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded bg-muted" />)}</div><div className="hidden flex-1 animate-pulse rounded bg-muted/50 md:block" /></div>
}
