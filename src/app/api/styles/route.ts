import { NextResponse } from 'next/server'
import { getAllStyles } from '@/lib/supabase/queries/styles'
import { handleApiError } from '@/lib/auth/helpers'

export async function GET() {
  try {
    const styles = await getAllStyles()
    return NextResponse.json(
      { data: styles },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } },
    )
  } catch (err) {
    return handleApiError(err)
  }
}
