import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { deletePortfolioStorageObjects } from '@/lib/upload/storage'
import { revalidateArtistPage } from '@/lib/cache/revalidate-artist'
import { z } from 'zod'

const updatePortfolioSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  body_part: z.string().trim().max(100).nullable().optional(),
  size_cm: z.string().trim().max(100).nullable().optional(),
  style_id: z.number().int().positive().nullable().optional(),
  healed_image_url: z.string().url().nullable().optional(),
}).strict().refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field is required',
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug, id } = await params
    const validation = updatePortfolioSchema.safeParse(await request.json())

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
    const { data, error } = await admin
      .from('portfolio_items')
      .update(validation.data)
      .eq('id', id)
      .eq('artist_id', artist.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    revalidateArtistPage(slug)
    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug, id } = await params

    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || artist.slug !== slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Atomic delete-and-return: one round trip, no fetch/delete race window.
    // 0 matching rows (missing id or not owned by this artist) -> error, not
    // a null data value, because .single() expects exactly one row.
    const { data: item, error } = await admin
      .from('portfolio_items')
      .delete()
      .eq('id', id)
      .eq('artist_id', artist.id)
      .select('image_url, thumbnail_url, healed_image_url')
      .single()

    if (error || !item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // HAR-664: the public slug page is statically cached — revalidate it so
    // a portfolio removal is visible without waiting for the next deploy.
    revalidateArtistPage(slug)

    await deletePortfolioStorageObjects(admin, [
      item.image_url,
      item.thumbnail_url,
      item.healed_image_url,
    ])

    return NextResponse.json({ success: true })
  } catch (err) {
    return handleApiError(err)
  }
}
