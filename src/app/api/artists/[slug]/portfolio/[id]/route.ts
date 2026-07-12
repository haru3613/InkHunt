import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { deletePortfolioStorageObjects } from '@/lib/upload/storage'

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

    const { data: item, error: fetchError } = await admin
      .from('portfolio_items')
      .select('id, image_url, thumbnail_url, healed_image_url')
      .eq('id', id)
      .eq('artist_id', artist.id)
      .single()

    if (fetchError || !item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error: deleteError } = await admin
      .from('portfolio_items')
      .delete()
      .eq('id', id)
      .eq('artist_id', artist.id)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

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
