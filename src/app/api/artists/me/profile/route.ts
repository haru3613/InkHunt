import { NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { flattenArtistStyles } from '@/lib/supabase/transforms'

/** Private owner projection, including address, independent of public approval. */
export async function GET() {
  try {
    const user = await requireAuth()
    const artist = await getArtistForUser(user.lineUserId)
    if (!artist) return NextResponse.json({error:'Artist not found'},{status:404})
    const { data, error } = await createAdminClient().from('artist_styles').select('style_id, styles(*)').eq('artist_id',artist.id)
    if(error)throw error
    const ownProfile: Record<string,unknown> = {...artist,styles:flattenArtistStyles(data??[])}
    delete ownProfile.admin_note
    return NextResponse.json(ownProfile,{headers:{'Cache-Control':'private, no-store'}})
  }catch(error){return handleApiError(error)}
}
