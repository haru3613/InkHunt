import { NextResponse } from 'next/server'
import { getAllStyles } from '@/lib/supabase/queries/styles'

export async function GET() {
  try {
    const styles = await getAllStyles()
    return NextResponse.json({ data: styles })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch styles' },
      { status: 500 },
    )
  }
}
