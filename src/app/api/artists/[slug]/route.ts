import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { flattenArtistStyles } from '@/lib/supabase/transforms'
import { revalidateArtistPage } from '@/lib/cache/revalidate-artist'
import { updateArtistSchema } from './schema'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServerClient()

  const { data: artist, error } = await supabase
    .from('artists')
    .select(`
      id, slug, display_name, bio, avatar_url, ig_handle,
      city, district, price_min, price_max, pricing_note, deposit_amount,
      booking_notice, status, is_claimed, featured,
      offers_coverup, offers_custom_design, has_flash_designs,
      created_at, updated_at,
      artist_styles(style_id, styles(*))
    `)
    .eq('slug', slug)
    .single()

  if (error || !artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const styles = flattenArtistStyles(artist.artist_styles)
  // Keep a defensive response boundary even though the SELECT above is already
  // explicit; tests and future query changes must not reintroduce private data.
  const publicArtist: Record<string, unknown> = { ...artist }
  for (const privateField of [
    'artist_styles',
    'admin_note',
    'line_user_id',
    'address',
    'lat',
    'lng',
    'quote_templates',
  ]) {
    delete publicArtist[privateField]
  }
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

    // HAR-664: the public slug page is statically cached — revalidate it so
    // a profile edit is visible without waiting for the next deploy.
    revalidateArtistPage(slug)

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
