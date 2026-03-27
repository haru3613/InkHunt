import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getLineProfile } from '@/lib/line/auth'

function derivePassword(lineUserId: string): string {
  const secret = process.env.AUTH_PASSWORD_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createHmac('sha256', secret).update(lineUserId).digest('hex')
}

function buildUserMetadata(profile: { userId: string; displayName: string; pictureUrl?: string }) {
  return {
    line_user_id: profile.userId,
    name: profile.displayName,
    picture: profile.pictureUrl,
    sub: profile.userId,
    provider: 'line',
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  if (error || !code) {
    return NextResponse.redirect(
      `${baseUrl}?auth_error=${error ?? 'no_code'}`,
    )
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('line_auth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}?auth_error=invalid_state`)
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const profile = await getLineProfile(tokens.access_token)

    // Try Supabase OIDC sign-in first
    const supabase = await createServerClient()
    const { error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'kakao',
      token: tokens.id_token,
      nonce: cookieStore.get('line_auth_nonce')?.value ?? '',
    })

    if (authError) {
      // Fallback: admin-based sign-in for LINE (not natively supported by Supabase)
      // Strategy: try sign-in first (O(1)), create user only if sign-in fails
      const adminClient = createAdminClient()
      const email = `${profile.userId}@line.inkhunt.local`
      const password = derivePassword(profile.userId)
      const metadata = buildUserMetadata(profile)

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInErr) {
        // User doesn't exist or has old password — create or migrate
        const { error: createErr } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: metadata,
        })

        if (createErr) {
          // User exists with old (insecure) password — migrate to HMAC password
          await adminClient.auth.admin.updateUserById(
            // Look up by email: Supabase admin API getUserById doesn't work here,
            // so we use the deterministic email to find the user via listUsers with
            // pagination limited to 1 page. This only runs once per user migration.
            await findUserIdByEmail(adminClient, email),
            { password, user_metadata: metadata },
          )
        }

        // Sign in with the new/updated credentials
        await supabase.auth.signInWithPassword({ email, password })
      }
    }

    // Clean up auth cookies
    cookieStore.delete('line_auth_state')
    cookieStore.delete('line_auth_nonce')
    const redirectTo = cookieStore.get('line_auth_redirect')?.value ?? '/'
    cookieStore.delete('line_auth_redirect')

    return NextResponse.redirect(`${baseUrl}${redirectTo}`)
  } catch {
    return NextResponse.redirect(`${baseUrl}?auth_error=callback_failed`)
  }
}

/**
 * Find a Supabase auth user ID by email. Only used during password migration
 * from the old insecure scheme. Once all users have logged in once with the
 * new HMAC password, this path is never hit again.
 */
async function findUserIdByEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<string> {
  // Supabase Admin API doesn't expose getUserByEmail directly.
  // Paginate in small batches to find the user by email.
  let page = 1
  const perPage = 50
  while (true) {
    const { data: { users } } = await adminClient.auth.admin.listUsers({ page, perPage })
    const found = users.find((u) => u.email === email)
    if (found) return found.id
    if (users.length < perPage) break
    page++
  }
  throw new Error('User not found for migration')
}
