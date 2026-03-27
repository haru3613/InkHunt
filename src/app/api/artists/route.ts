import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createArtistSchema = z.object({
  display_name: z.string().min(1).max(100),
  bio: z.string().max(1000).nullable().optional(),
  city: z.string().min(1),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  price_min: z.number().int().min(0).nullable().optional(),
  price_max: z.number().int().min(0).nullable().optional(),
  ig_handle: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  booking_notice: z.string().nullable().optional(),
  style_ids: z.array(z.number()).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = createArtistSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { style_ids, ...artistData } = validation.data

    const slug =
      artistData.display_name
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36)

    const { data: artist, error } = await admin
      .from('artists')
      .insert({
        ...artistData,
        slug,
        line_user_id: user.lineUserId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    if (style_ids.length > 0) {
      await admin
        .from('artist_styles')
        .insert(style_ids.map((style_id) => ({ artist_id: artist.id, style_id })))
    }

    return NextResponse.json(artist, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  // Keep existing list endpoint -- will be replaced when mock data is removed
  return NextResponse.json({ message: 'TODO - migrate from mock data' })
}
