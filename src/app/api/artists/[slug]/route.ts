import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { flattenArtistStyles } from '@/lib/supabase/transforms'
import { z } from 'zod'

const updateArtistSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).nullable().optional(),
  city: z.string().min(1).optional(),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  price_min: z.number().int().min(0).nullable().optional(),
  price_max: z.number().int().min(0).nullable().optional(),
  ig_handle: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  booking_notice: z.string().nullable().optional(),
  style_ids: z.array(z.number()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServerClient()

  const { data: artist, error } = await supabase
    .from('artists')
    .select('*, artist_styles(style_id, styles(*))')
    .eq('slug', slug)
    .single()

  if (error || !artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const styles = flattenArtistStyles(artist.artist_styles)
  const { admin_note: _note, artist_styles: _as, ...publicArtist } = artist
  return NextResponse.json({ ...publicArtist, styles })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug } = await params
    const body = await request.json()
    const validation = updateArtistSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || artist.slug !== slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { style_ids, ...updateData } = validation.data

    const { data: updated, error } = await admin
      .from('artists')
      .update(updateData)
      .eq('id', artist.id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    if (style_ids !== undefined) {
      const { data: oldStyles } = await admin
        .from('artist_styles')
        .select('style_id')
        .eq('artist_id', artist.id)

      await admin.from('artist_styles').delete().eq('artist_id', artist.id)
      if (style_ids.length > 0) {
        const { error: insertErr } = await admin
          .from('artist_styles')
          .insert(style_ids.map((style_id) => ({ artist_id: artist.id, style_id })))

        if (insertErr && oldStyles && oldStyles.length > 0) {
          // Rollback: re-insert old styles on failure
          await admin
            .from('artist_styles')
            .insert(oldStyles.map((s) => ({ artist_id: artist.id, style_id: s.style_id })))
          return NextResponse.json({ error: 'Failed to update styles' }, { status: 500 })
        }
      }
    }

    return NextResponse.json(updated)
  } catch (err) {
    return handleApiError(err)
  }
}
