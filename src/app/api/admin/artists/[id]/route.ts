import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

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
    const body = await request.json()
    const validation = updateStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
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

    return NextResponse.json(data)
  } catch (err) {
    return handleApiError(err)
  }
}
