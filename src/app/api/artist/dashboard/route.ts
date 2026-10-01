import { NextRequest, NextResponse } from 'next/server'
import { getArtistForUser, handleApiError, requireAuth } from '@/lib/auth/helpers'
import { getArtistDashboardData, type ArtistDashboardDatabase } from '@/lib/artist-dashboard/data'
import { getTaipeiDate, isValidDateKey } from '@/lib/artist-dashboard/dates'
import { createAdminClient } from '@/lib/supabase/server'
import type { DashboardPeriod } from '@/types/artist-dashboard'

export const dynamic = 'force-dynamic'

function parsePeriod(value: string | null): DashboardPeriod | null {
  if (value === null) return 30
  if (value === '7' || value === '30' || value === '90') return Number(value) as DashboardPeriod
  return null
}

export async function GET(request: NextRequest) {
  try {
    const period = parsePeriod(request.nextUrl.searchParams.get('period'))
    const date = request.nextUrl.searchParams.get('date') ?? getTaipeiDate(new Date())
    if (!period || !isValidDateKey(date)) {
      return NextResponse.json({ error: 'date must be YYYY-MM-DD and period must be 7, 30, or 90' }, { status: 400 })
    }

    const user = await requireAuth()
    const artist = await getArtistForUser(user.lineUserId)
    if (!artist) return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 })

    const data = await getArtistDashboardData(
      createAdminClient() as unknown as ArtistDashboardDatabase,
      artist.id,
      user.lineUserId,
      date,
      period,
    )
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (err) {
    return handleApiError(err)
  }
}
