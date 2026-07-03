import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { pushReviewOutcomeNotification } from '@/lib/line/messaging'
import type { Artist } from '@/types/database'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

const updateStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
  admin_note: z.string().max(1000).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin()
    const { id } = await params
    const idResult = uuidSchema.safeParse(id)
    if (!idResult.success) {
      return NextResponse.json({ error: 'Invalid artist ID' }, { status: 400 })
    }
    const body = await request.json()
    const validation = updateStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()

    // Capture the prior status so we only push the review-outcome notification
    // on a real review decision (pending → active/suspended), not on a later
    // admin re-suspend of an already-live artist.
    const { data: prior } = await admin
      .from('artists')
      .select('status')
      .eq('id', id)
      .single()

    const { data, error } = await admin
      .from('artists')
      .update({
        status: validation.data.status,
        admin_note: validation.data.admin_note ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
    }

    if ((prior as { status?: string } | null)?.status === 'pending') {
      // Fire-and-forget: LINE push is non-fatal to the admin action.
      pushReviewOutcomeNotification(
        data as Artist,
        validation.data.status === 'active' ? 'approved' : 'rejected',
      ).catch(() => {
        // LINE notification failure is non-fatal
      })
    }

    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err)
  }
}
