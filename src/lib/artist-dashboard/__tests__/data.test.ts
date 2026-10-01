import { describe, expect, it } from 'vitest'
import { buildArtistDashboardData, getArtistDashboardData, type ArtistDashboardDatabase } from '../data'

const now = new Date('2026-04-08T04:00:00.000Z') // 12:00 Taipei

const baseInquiry = (id: string, createdAt = '2026-04-07T16:00:00.000Z') => ({
  id,
  consumer_name: `客人 ${id}`,
  description: '想刺一朵花',
  body_part: '手臂',
  status: 'pending' as const,
  created_at: createdAt,
})

describe('buildArtistDashboardData', () => {
  it('deduplicates quote versions, excludes cancellations, and prioritizes oldest reply', () => {
    const result = buildArtistDashboardData({
      artistLineUserId: 'artist-line',
      selectedDate: '2026-04-08',
      period: 7,
      now,
      inquiries: [
        baseInquiry('old', '2026-04-01T15:59:59.999Z'),
        baseInquiry('new'),
        baseInquiry('awaiting'),
        { ...baseInquiry('closed'), status: 'closed' as const },
      ],
      quotes: [
        { inquiry_id: 'new', status: 'sent' as const, created_at: '2026-04-06T04:00:00.000Z' },
        // Acceptance is a prior version; it still settles this new inquiry.
        { inquiry_id: 'new', status: 'accepted' as const, created_at: '2026-03-15T04:00:00.000Z' },
        { inquiry_id: 'awaiting', status: 'viewed' as const, created_at: '2026-04-07T04:00:00.000Z' },
        // A new quote cannot pull an older inquiry into this period's cohort.
        { inquiry_id: 'old', status: 'viewed' as const, created_at: '2026-04-07T04:00:00.000Z' },
      ],
      messages: [
        { inquiry_id: 'old', sender_type: 'consumer' as const, sender_id: 'consumer', read_at: null, created_at: '2026-04-02T04:00:00.000Z' },
        { inquiry_id: 'old', sender_type: 'system' as const, sender_id: null, read_at: null, created_at: '2026-04-02T04:01:00.000Z' },
        { inquiry_id: 'new', sender_type: 'artist' as const, sender_id: 'artist-line', read_at: null, created_at: '2026-04-05T04:00:00.000Z' },
        { inquiry_id: 'new', sender_type: 'consumer' as const, sender_id: 'consumer', read_at: null, created_at: '2026-04-06T04:00:00.000Z' },
        { inquiry_id: 'closed', sender_type: 'consumer' as const, sender_id: 'consumer', read_at: null, created_at: '2026-04-01T04:00:00.000Z' },
      ],
      appointments: [
        { id: 'confirmed', inquiry_id: 'old', starts_at: '2026-04-06T02:00:00.000Z', location: '工作室', status: 'confirmed' as const },
        { id: 'cancelled', inquiry_id: 'new', starts_at: '2026-04-07T02:00:00.000Z', location: '工作室', status: 'cancelled' as const },
      ],
    })

    expect(result.actionQueue.map(item => item.id)).toEqual(['old', 'new', 'awaiting'])
    expect(result.actionQueue[0].unreadCount).toBe(1)
    expect(result.actionQueue[0].waitingSince).toBe('2026-04-02T04:00:00.000Z')
    expect(result.actionQueue[0].waitingSince).not.toBe(result.actionQueue[0].createdAt)
    expect(result.needsReplyCount).toBe(3)
    expect(result.metrics.quotedInquiries).toBe(2)
    expect(result.metrics.acceptedInquiries).toBe(1)
    expect(result.metrics.awaitingQuoteResponse).toBe(1)
    expect(result.metrics.quoteAcceptanceRate).toBe(50)
    expect(result.appointments.map(item => item.id)).toEqual(['confirmed'])
    expect(result.metrics.confirmedAppointments).toBe(1)
    expect(result.metrics.upcomingConfirmedAppointments).toBe(0)
  })

  it('uses Taipei date boundaries for periods and selected weeks', () => {
    const result = buildArtistDashboardData({
      artistLineUserId: 'artist-line', selectedDate: '2026-04-05', period: 7, now,
      inquiries: [
        baseInquiry('before', '2026-04-01T15:59:59.999Z'),
        baseInquiry('inside', '2026-04-01T16:00:00.000Z'),
      ], quotes: [], messages: [],
      appointments: [
        { id: 'lastWeek', inquiry_id: 'inside', starts_at: '2026-03-29T15:59:59.999Z', location: 'x', status: 'proposed' as const },
        { id: 'monday', inquiry_id: 'inside', starts_at: '2026-03-29T16:00:00.000Z', location: 'x', status: 'proposed' as const },
      ],
    })
    expect(result.week).toEqual({ start: '2026-03-30', endExclusive: '2026-04-06' })
    expect(result.metrics.newInquiries).toBe(1)
    expect(result.appointments.map(item => item.id)).toEqual(['monday'])
  })
})

class FakeQuery<Row extends Record<string, unknown>> implements PromiseLike<{ data: Row[] | null; error: { message: string } | null }> {
  private readonly predicates: Array<(row: Row) => boolean> = []
  constructor(private readonly rows: Row[]) {}
  select(): this { return this }
  eq(column: string, value: string): this { this.predicates.push(row => row[column] === value); return this }
  in(column: string, values: string[]): this { this.predicates.push(row => values.includes(String(row[column]))); return this }
  order(): this { return this }
  range(from: number, to: number): Promise<{ data: Row[]; error: null }> {
    return Promise.resolve({ data: this.rows.filter(row => this.predicates.every(test => test(row))).slice(from, to + 1), error: null })
  }
  then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> { return this.range(0, Number.MAX_SAFE_INTEGER).then(onfulfilled, onrejected) }
}

describe('getArtistDashboardData', () => {
  it('paginates past PostgREST defaults and never admits a different artist', async () => {
    const own = Array.from({ length: 1_001 }, (_, index) => ({ ...baseInquiry(`own-${index}`), artist_id: 'artist-1' }))
    const other = Array.from({ length: 40 }, (_, index) => ({ ...baseInquiry(`other-${index}`), artist_id: 'artist-2' }))
    const db = {
      from(table: string) {
        const rows = table === 'inquiries' ? [...own, ...other]
          : table === 'quotes' ? []
            : table === 'messages' ? [] : []
        return new FakeQuery(rows)
      },
    } as unknown as ArtistDashboardDatabase
    const result = await getArtistDashboardData(db, 'artist-1', 'artist-line', '2026-04-08', 7, now)
    expect(result.metrics.newInquiries).toBe(1_001)
    expect(result.needsReplyCount).toBe(1_001)
    expect(result.actionQueue).toHaveLength(5)
  })
})
