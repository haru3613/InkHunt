import { NextResponse } from 'next/server'
import { requireAuth, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const user = await requireAuth()
    const admin = createAdminClient()

    const { data: artist } = await admin
      .from('artists')
      .select('id,status')
      .eq('line_user_id', user.lineUserId)
      .single()

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if (artist.status !== 'suspended') {
      return NextResponse.json({ error: 'Artist is not rejected' }, { status: 409 })
    }

    const { data, error } = await admin
      .from('artists')
      .update({ status: 'pending', admin_note: null })
      .eq('id', artist.id)
      .eq('status', 'suspended')
      .select('id,status,admin_note')
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Artist is not rejected' }, { status: 409 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err)
  }
}
