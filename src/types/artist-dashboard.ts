export type DashboardPeriod = 7 | 30 | 90

export interface DashboardAppointment {
  id: string
  inquiryId: string
  startsAt: string
  location: string
  status: 'proposed' | 'confirmed'
  consumerName: string | null
  bodyPart: string | null
  description: string
}

export interface DashboardInquiry {
  id: string
  consumerName: string | null
  description: string
  bodyPart: string | null
  createdAt: string
  waitingSince: string
  unreadCount: number
}

export interface ArtistDashboardData {
  timezone: 'Asia/Taipei'
  today: string
  week: { start: string; endExclusive: string }
  period: { days: DashboardPeriod; start: string; endExclusive: string }
  appointments: DashboardAppointment[]
  actionQueue: DashboardInquiry[]
  needsReplyCount: number
  metrics: {
    newInquiries: number
    quotedInquiries: number
    acceptedInquiries: number
    awaitingQuoteResponse: number
    quoteAcceptanceRate: number | null
    confirmedAppointments: number
    upcomingConfirmedAppointments: number
  }
}
