import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { revalidateArtistPage } from '@/lib/cache/revalidate-artist'
import { z } from 'zod'

const createPortfolioSchema = z.object({
  idempotency_key: z.uuid().optional(),
  image_url: z.string().url(),
  thumbnail_url: z.string().url().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  body_part: z.string().nullable().optional(),
  size_cm: z.string().nullable().optional(),
  style_id: z.number().nullable().optional(),
  healed_image_url: z.string().url().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServerClient()

  // HAR-540: gate status=active so a pending/rejected artist's portfolio is not
  // exposed on this public GET. Owner uploads use POST (owner-scoped), not this.
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()
  if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('artist_id', artist.id)
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug } = await params
    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || artist.slug !== slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const validation = createPortfolioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { idempotency_key: idempotencyKey, ...portfolioData } = validation.data

    if (idempotencyKey) {
      const { data: existingItem, error: existingItemError } = await admin
        .from('portfolio_items')
        .select('*')
        .eq('id', idempotencyKey)
        .eq('artist_id', artist.id)
        .maybeSingle()

      if (existingItemError) {
        return NextResponse.json({ error: existingItemError.message }, { status: 500 })
      }
      if (existingItem) return NextResponse.json(existingItem)
    }

    const { data: maxOrder } = await admin
      .from('portfolio_items')
      .select('sort_order')
      .eq('artist_id', artist.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.sort_order ?? -1) + 1

    const { data, error } = await admin
      .from('portfolio_items')
      .insert({
        ...(idempotencyKey ? { id: idempotencyKey } : {}),
        artist_id: artist.id,
        ...portfolioData,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      if (idempotencyKey && error.code === '23505') {
        // A retry can race the original request between the lookup and insert.
        // Scope the recovery lookup to the authenticated artist so a UUID owned
        // by another artist can never be returned as the retry result.
        const { data: existingItem, error: existingItemError } = await admin
          .from('portfolio_items')
          .select('*')
          .eq('id', idempotencyKey)
          .eq('artist_id', artist.id)
          .maybeSingle()

        if (existingItemError) {
          return NextResponse.json({ error: existingItemError.message }, { status: 500 })
        }
        if (existingItem) return NextResponse.json(existingItem)

        return NextResponse.json(
          { error: 'Idempotency key conflict', code: 'IDEMPOTENCY_KEY_CONFLICT' },
          { status: 409 },
        )
      }

      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // HAR-664: the public slug page is statically cached — revalidate it so
    // a new portfolio item is visible without waiting for the next deploy.
    revalidateArtistPage(slug)

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
