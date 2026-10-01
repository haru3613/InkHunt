import { NextResponse } from 'next/server'
import { getAllStyles } from '@/lib/supabase/queries/styles'

export async function GET() {
  try {
    // Cache only the public taxonomy, never session or artist-specific data.
    // Database failures must not become a cached successful empty response.
    const styles = await getAllStyles({ throwOnError: true })
    return NextResponse.json({ data: styles }, {
      headers: {
        'Cache-Control': 'public, max-age=60',
        'Vercel-CDN-Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
