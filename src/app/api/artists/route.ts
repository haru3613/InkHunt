import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { getArtists } from '@/lib/supabase/queries/artists'
import { z } from 'zod'
import { createArtistSchema } from './schema'

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
    const { style_ids, style_slugs, can_cover, accept_custom, has_flash_designs, ...artistData } =
      validation.data

    // Resolve wizard-sent style_slugs to ids so they land in artist_styles
    // alongside any caller-supplied style_ids (deduped).
    const resolvedStyleIds = new Set(style_ids)
    if (style_slugs.length > 0) {
      const { data: styleRows } = await admin.from('styles').select('id').in('slug', style_slugs)
      for (const row of styleRows ?? []) resolvedStyleIds.add(row.id)
    }

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
        ...(can_cover !== undefined ? { offers_coverup: can_cover } : {}),
        ...(accept_custom !== undefined ? { offers_custom_design: accept_custom } : {}),
        ...(has_flash_designs !== undefined ? { has_flash_designs } : {}),
        slug,
        line_user_id: user.lineUserId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    if (resolvedStyleIds.size > 0) {
      await admin
        .from('artist_styles')
        .insert([...resolvedStyleIds].map((style_id) => ({ artist_id: artist.id, style_id })))
    }

    return NextResponse.json(artist, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}

const listArtistsSchema = z.object({
  style: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = listArtistsSchema.parse({
      style: searchParams.get('style') ?? undefined,
      city: searchParams.get('city') ?? undefined,
      page: searchParams.get('page') ?? undefined,
      pageSize: searchParams.get('pageSize') ?? undefined,
    })

    const result = await getArtists(params)

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: err.flatten().fieldErrors },
        { status: 400 },
      )
    }
    return handleApiError(err)
  }
}
