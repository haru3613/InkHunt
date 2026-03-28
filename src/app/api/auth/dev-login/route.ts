import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Dev-only login endpoint. Creates or signs in a test user without LINE OAuth.
 * Only available in development mode.
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const lineUserId = body.line_user_id ?? 'dev-user-001'
  const displayName = body.display_name ?? 'Dev User'

  const email = `${lineUserId.toLowerCase()}@line.inkhunt.local`
  const secret = process.env.AUTH_PASSWORD_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  const password = createHmac('sha256', secret).update(lineUserId).digest('hex')

  const adminClient = createAdminClient()
  const supabase = await createServerClient()

  // Try sign in first
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInErr) {
    // Create user if doesn't exist
    const { error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        line_user_id: lineUserId,
        name: displayName,
        sub: lineUserId,
        provider: 'line',
      },
    })

    if (createErr) {
      // User exists with different password — update it
      const { data: { users } } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 50 })
      const existing = users.find((u) => u.email === email)
      if (existing) {
        await adminClient.auth.admin.updateUserById(existing.id, { password })
      }
    }

    // Sign in
    const { error: retryErr } = await supabase.auth.signInWithPassword({ email, password })
    if (retryErr) {
      return NextResponse.json({ error: retryErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, email, lineUserId, displayName })
}
