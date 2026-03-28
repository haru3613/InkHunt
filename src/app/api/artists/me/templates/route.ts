import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser, handleApiError } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const quoteTemplateSchema = z.object({
  label: z.string().min(1).max(50),
  price: z.number().int().min(0),
  note: z.string().max(200).optional(),
})

const putBodySchema = z.object({
  templates: z.array(quoteTemplateSchema).max(5),
})

export async function GET() {
  try {
    const user = await requireAuth()
    const artist = await getArtistForUser(user.lineUserId)

    if (!artist) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 })
    }

    return NextResponse.json({ templates: artist.quote_templates ?? [] })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    const artist = await getArtistForUser(user.lineUserId)

    if (!artist) {
      return NextResponse.json({ error: 'Artist profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = putBodySchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('artists')
      .update({ quote_templates: validation.data.templates })
      .eq('id', artist.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ templates: validation.data.templates })
  } catch (err) {
    return handleApiError(err)
  }
}
