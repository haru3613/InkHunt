import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { dashboardFixture } from '@/components/artists/dashboard/__tests__/fixture'
import { addDays, getWeekStart } from '@/lib/artist-dashboard/dates'
import { formatCalendarDate } from '@/components/artists/dashboard/CalendarWeek'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => <a href={href} {...props}>{children}</a>,
}))
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { displayName: '刺青師' }, artist: { status: 'active', display_name: '刺青師', price_min: 3000, portfolio_count: 5, slug: 'test-artist' } }) }))

import DashboardPage from '../page'

function mockDashboard() {
  return vi.fn().mockImplementation(async (url: string) => {
    const params = new URL(url, 'http://localhost').searchParams
    const data = dashboardFixture()
    const start = params.get('date') ?? data.week.start
    const days = Number(params.get('period') ?? 30) as 7 | 30 | 90
    return { ok: true, json: async () => ({ ...data, week: { start, endExclusive: addDays(start, 7) }, period: { ...data.period, days, start: addDays(data.today, 1 - days) } }) }
  })
}

describe('Artist calendar dashboard', () => {
  beforeEach(() => vi.stubGlobal('fetch', mockDashboard()))

  it('does not freeze a build-time calendar date into static server markup', () => {
    const html = renderToString(<DashboardPage />)
    expect(html).toContain('正在載入行事曆')
    expect(html).not.toContain(formatCalendarDate(dashboardFixture().today))
  })

  it('uses aggregate metrics above 20 and links each calendar/queue item to its conversation', async () => {
    render(<DashboardPage />)
    expect(await screen.findByText('47')).toBeInTheDocument()
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '處理 24 則待回覆' })).toHaveAttribute('href', '/artist/inquiries?inquiry=waiting-inquiry')
    expect(screen.getByRole('link', { name: /15:00 前臂植物，已確認，開啟詢價/ })).toHaveAttribute('href', '/artist/inquiries?inquiry=older-inquiry')
    expect(screen.getByRole('link', { name: '回覆 小明 的詢價' })).toHaveAttribute('href', '/artist/inquiries?inquiry=waiting-inquiry')
    expect(screen.queryByText('已接受／已關閉')).not.toBeInTheDocument()
  })

  it('selects a day locally and browses weeks while keeping the metric period', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    await screen.findByText('47')
    const fixture = dashboardFixture()
    const anotherDay = fixture.today === fixture.week.start ? addDays(fixture.week.start, 1) : fixture.week.start
    await user.click(screen.getByRole('button', { name: formatCalendarDate(anotherDay) }))
    const agenda = screen.getByRole('complementary', { name: '當日安排與待回覆詢價' })
    expect(within(agenda).getByText('這天沒有預約安排')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: '下一週' }))
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(`/api/artist/dashboard?date=${addDays(getWeekStart(anotherDay), 7)}&period=30`, expect.anything()))
    await user.click(screen.getByRole('button', { name: '今天' }))
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(`/api/artist/dashboard?date=${fixture.week.start}&period=30`, expect.anything()))
  })

  it('changes the real statistics period through the labelled selector', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)
    await screen.findByText('47')
    await user.click(screen.getByRole('combobox', { name: '統計期間' }))
    // Base UI mounts the portalled list asynchronously after opening.
    await user.click(await screen.findByRole('option', { name: '近 7 天' }))
    await waitFor(() => expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('&period=7'), expect.anything()))
  })

  it('shows a retry error instead of converting unavailable data into zero', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 }).mockResolvedValueOnce({ ok: true, json: async () => dashboardFixture() })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('無法載入工作台')
    expect(screen.queryByText('47')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '重新載入' }))
    expect(await screen.findByText('47')).toBeInTheDocument()
  })

  it('shows no percentage for a new artist without quoted inquiries', async () => {
    const data = dashboardFixture()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...data, appointments: [], actionQueue: [], needsReplyCount: 0, metrics: { newInquiries: 0, quotedInquiries: 0, acceptedInquiries: 0, awaitingQuoteResponse: 0, quoteAcceptanceRate: null, confirmedAppointments: 0, upcomingConfirmedAppointments: 0 } }) }))
    render(<DashboardPage />)
    expect(await screen.findByText('目前沒有待回覆的詢價')).toBeInTheDocument()
    expect(screen.getByText('尚無可計算的報價')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })
})
