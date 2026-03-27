import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createPortfolioSchema = z.object({
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

  const { data: artist } = await supabase.from('artists').select('id').eq('slug', slug).single()
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
    const body = await request.json()
    const validation = createPortfolioSchema.safeParse(body)

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
        artist_id: artist.id,
        ...validation.data,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return handleApiError(err)
  }
}
