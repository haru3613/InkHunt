import { addDays, getTaipeiDate, getWeekStart } from '@/lib/artist-dashboard/dates'
import type { ArtistDashboardData } from '@/types/artist-dashboard'

export function dashboardFixture(): ArtistDashboardData {
  const today = getTaipeiDate(new Date())
  const start = getWeekStart(today)
  return {
    timezone: 'Asia/Taipei', today,
    week: { start, endExclusive: addDays(start, 7) },
    period: { days: 30, start: addDays(today, -29), endExclusive: addDays(today, 1) },
    appointments: [{ id: 'appt-1', inquiryId: 'older-inquiry', startsAt: `${today}T15:00:00+08:00`, location: '台北工作室', status: 'confirmed', consumerName: '小晴', bodyPart: '前臂植物', description: '細線植物設計' }],
    actionQueue: [{ id: 'waiting-inquiry', consumerName: '小明', description: '想討論幾何刺青', bodyPart: '小腿', createdAt: `${today}T09:00:00+08:00`, waitingSince: `${today}T09:00:00+08:00`, unreadCount: 2 }],
    needsReplyCount: 24,
    metrics: { newInquiries: 47, quotedInquiries: 10, acceptedInquiries: 6, awaitingQuoteResponse: 4, quoteAcceptanceRate: 60, confirmedAppointments: 6, upcomingConfirmedAppointments: 4 },
  }
}
