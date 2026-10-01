import type {
  ArtistDashboardData,
  DashboardAppointment,
  DashboardInquiry,
  DashboardPeriod,
} from '@/types/artist-dashboard'
import { addDays, getTaipeiDate, getWeekStart, taipeiStartOfDay } from './dates'

type InquiryRow = {
  id: string
  consumer_name: string | null
  description: string
  body_part: string | null
  status: 'pending' | 'quoted' | 'accepted' | 'closed'
  created_at: string
}

type QuoteRow = {
  inquiry_id: string
  status: 'sent' | 'viewed' | 'accepted' | 'rejected'
  created_at: string
}

type MessageRow = {
  inquiry_id: string
  sender_type: 'consumer' | 'artist' | 'system'
  sender_id: string | null
  read_at: string | null
  created_at: string
}

type AppointmentRow = {
  id: string
  inquiry_id: string
  starts_at: string
  location: string
  status: 'proposed' | 'confirmed' | 'cancelled'
}

interface QueryResult<Row> {
  data: Row[] | null
  error: { message: string } | null
}

interface Query<Row> extends PromiseLike<QueryResult<Row>> {
  select(columns: string): Query<Row>
  eq(column: string, value: string): Query<Row>
  in(column: string, values: string[]): Query<Row>
  order(column: string, options?: { ascending: boolean }): Query<Row>
  range(from: number, to: number): PromiseLike<QueryResult<Row>>
}

export interface ArtistDashboardDatabase {
  from<Row>(table: string): Query<Row>
}

const PAGE_SIZE = 500
const ID_BATCH_SIZE = 200

async function fetchAll<Row>(makeQuery: () => Query<Row>, table: string): Promise<Row[]> {
  const rows: Row[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await makeQuery().range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`Failed to fetch ${table}: ${error.message}`)
    const page = data ?? []
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

async function fetchForInquiryIds<Row>(
  db: ArtistDashboardDatabase,
  table: 'messages' | 'appointments',
  inquiryIds: string[],
): Promise<Row[]> {
  const rows: Row[] = []
  for (let start = 0; start < inquiryIds.length; start += ID_BATCH_SIZE) {
    const ids = inquiryIds.slice(start, start + ID_BATCH_SIZE)
    const columns = table === 'messages'
      ? 'inquiry_id, sender_type, sender_id, read_at, created_at'
      : 'id, inquiry_id, starts_at, location, status'
    rows.push(...await fetchAll(
      () => db.from<Row>(table)
        .select(columns)
        .in('inquiry_id', ids)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }),
      table,
    ))
  }
  return rows
}

function isWithin(value: string, startInclusive: string, endExclusive: string): boolean {
  const time = new Date(value).getTime()
  return time >= new Date(startInclusive).getTime() && time < new Date(endExclusive).getTime()
}

function latestTimestamp(rows: MessageRow[], senderType: MessageRow['sender_type']): string | null {
  let latest: string | null = null
  for (const row of rows) {
    if (row.sender_type === senderType && (!latest || row.created_at > latest)) latest = row.created_at
  }
  return latest
}

function groupByInquiry<Row extends { inquiry_id: string }>(rows: Row[]): Map<string, Row[]> {
  const grouped = new Map<string, Row[]>()
  for (const row of rows) {
    const group = grouped.get(row.inquiry_id)
    if (group) group.push(row)
    else grouped.set(row.inquiry_id, [row])
  }
  return grouped
}

/**
 * Converts already owner-scoped rows into the dashboard contract. Keeping this
 * calculation pure makes date boundaries and quote version de-duplication
 * independently testable.
 */
export function buildArtistDashboardData(input: {
  artistLineUserId: string
  selectedDate: string
  period: DashboardPeriod
  now: Date
  inquiries: InquiryRow[]
  quotes: QuoteRow[]
  messages: MessageRow[]
  appointments: AppointmentRow[]
}): ArtistDashboardData {
  const today = getTaipeiDate(input.now)
  const weekStart = getWeekStart(input.selectedDate)
  const weekEndExclusive = addDays(weekStart, 7)
  const periodStart = addDays(today, 1 - input.period)
  const periodEndExclusive = addDays(today, 1)
  const periodStartAt = taipeiStartOfDay(periodStart)
  const periodEndExclusiveAt = taipeiStartOfDay(periodEndExclusive)
  const weekStartAt = taipeiStartOfDay(weekStart)
  const weekEndExclusiveAt = taipeiStartOfDay(weekEndExclusive)
  const inquiryById = new Map(input.inquiries.map(inquiry => [inquiry.id, inquiry]))
  const messagesByInquiry = groupByInquiry(input.messages)
  const quotesByInquiry = groupByInquiry(input.quotes)

  const queue = input.inquiries.flatMap(inquiry => {
    if (inquiry.status === 'closed') return []
    const messages = messagesByInquiry.get(inquiry.id) ?? []
    const latestConsumer = latestTimestamp(messages, 'consumer')
    const latestArtist = latestTimestamp(messages, 'artist')
    // A lead needs attention when no artist reply exists, or the consumer has
    // spoken after the latest artist reply. Read state is deliberately not the
    // source of truth: a read conversation can still need an answer.
    if (latestArtist && (!latestConsumer || latestConsumer <= latestArtist)) return []
    const unreadCount = messages.filter(message => (
      message.sender_type === 'consumer' && message.read_at === null
    )).length
    const item: DashboardInquiry = {
      id: inquiry.id,
      consumerName: inquiry.consumer_name,
      description: inquiry.description,
      bodyPart: inquiry.body_part,
      createdAt: inquiry.created_at,
      waitingSince: latestConsumer ?? inquiry.created_at,
      unreadCount,
    }
    return [{ item, queuedAt: latestConsumer ?? inquiry.created_at }]
  }).sort((left, right) => left.queuedAt.localeCompare(right.queuedAt))

  const appointments: DashboardAppointment[] = input.appointments
    .filter(appointment => (
      appointment.status !== 'cancelled'
      && isWithin(appointment.starts_at, weekStartAt, weekEndExclusiveAt)
    ))
    .sort((left, right) => left.starts_at.localeCompare(right.starts_at))
    .flatMap(appointment => {
      const inquiry = inquiryById.get(appointment.inquiry_id)
      if (!inquiry) return []
      return [{
        id: appointment.id,
        inquiryId: appointment.inquiry_id,
        startsAt: appointment.starts_at,
        location: appointment.location,
        status: appointment.status === 'confirmed' ? 'confirmed' : 'proposed',
        consumerName: inquiry.consumer_name,
        bodyPart: inquiry.body_part,
        description: inquiry.description,
      }]
    })

  // Quote metrics describe inquiries first received in the selected period.
  // A quote may be created or accepted later, so quote timestamps must not
  // move an older inquiry into this cohort or remove a current one from it.
  const quoteCohort = new Set(
    input.inquiries
      .filter(inquiry => isWithin(inquiry.created_at, periodStartAt, periodEndExclusiveAt))
      .map(inquiry => inquiry.id),
  )
  const quotedInquiryIds = new Set(
    input.quotes.filter(quote => quoteCohort.has(quote.inquiry_id)).map(quote => quote.inquiry_id),
  )
  const acceptedQuoteCohort = new Set(
    input.quotes
      .filter(quote => quote.status === 'accepted' && quoteCohort.has(quote.inquiry_id))
      .map(quote => quote.inquiry_id),
  )
  let awaitingQuoteResponse = 0
  for (const inquiryId of quoteCohort) {
    const versions = quotesByInquiry.get(inquiryId) ?? []
    const latest = versions.reduce<QuoteRow | null>(
      (current, quote) => !current || quote.created_at > current.created_at ? quote : current,
      null,
    )
    if (latest && (latest.status === 'sent' || latest.status === 'viewed')
      && !versions.some(quote => quote.status === 'accepted')) {
      awaitingQuoteResponse += 1
    }
  }

  const confirmedAppointments = input.appointments.filter(appointment => (
    appointment.status === 'confirmed'
    && isWithin(appointment.starts_at, periodStartAt, periodEndExclusiveAt)
  )).length
  // Upcoming means from this instant until the start of the Taipei calendar
  // day seven days after today; it excludes an appointment exactly at that end.
  const upcomingEndExclusive = taipeiStartOfDay(addDays(today, 7))
  const nowIso = input.now.toISOString()
  const upcomingConfirmedAppointments = input.appointments.filter(appointment => (
    appointment.status === 'confirmed'
    && new Date(appointment.starts_at).getTime() >= new Date(nowIso).getTime()
    && new Date(appointment.starts_at).getTime() < new Date(upcomingEndExclusive).getTime()
  )).length

  return {
    timezone: 'Asia/Taipei',
    today,
    week: { start: weekStart, endExclusive: weekEndExclusive },
    period: { days: input.period, start: periodStart, endExclusive: periodEndExclusive },
    appointments,
    actionQueue: queue.slice(0, 5).map(entry => entry.item),
    needsReplyCount: queue.length,
    metrics: {
      newInquiries: input.inquiries.filter(inquiry => (
        isWithin(inquiry.created_at, periodStartAt, periodEndExclusiveAt)
      )).length,
      quotedInquiries: quotedInquiryIds.size,
      acceptedInquiries: acceptedQuoteCohort.size,
      awaitingQuoteResponse,
      quoteAcceptanceRate: quotedInquiryIds.size === 0
        ? null
        : Math.round((acceptedQuoteCohort.size / quotedInquiryIds.size) * 100),
      confirmedAppointments,
      upcomingConfirmedAppointments,
    },
  }
}

export async function getArtistDashboardData(
  db: ArtistDashboardDatabase,
  artistId: string,
  artistLineUserId: string,
  selectedDate: string,
  period: DashboardPeriod,
  now = new Date(),
): Promise<ArtistDashboardData> {
  const inquiries = await fetchAll<InquiryRow>(
    () => db.from<InquiryRow>('inquiries')
      .select('id, consumer_name, description, body_part, status, created_at')
      .eq('artist_id', artistId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true }),
    'inquiries',
  )
  const inquiryIds = inquiries.map(inquiry => inquiry.id)
  const [quotes, messages, appointments] = await Promise.all([
    fetchAll<QuoteRow>(
      () => db.from<QuoteRow>('quotes')
        .select('inquiry_id, status, created_at')
        .eq('artist_id', artistId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true }),
      'quotes',
    ),
    fetchForInquiryIds<MessageRow>(db, 'messages', inquiryIds),
    fetchForInquiryIds<AppointmentRow>(db, 'appointments', inquiryIds),
  ])
  return buildArtistDashboardData({
    artistLineUserId,
    selectedDate,
    period,
    now,
    inquiries,
    quotes,
    messages,
    appointments,
  })
}
