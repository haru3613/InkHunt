import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHmac } from 'crypto'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import {
  exchangeCodeForTokens,
  getLineProfile,
  getSafeLineRedirectPath,
} from '@/lib/line/auth'
import { buildAppMetadata } from '@/lib/auth/helpers'
import { reportError } from '@/lib/observability'

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

/**
 * Ensure app_metadata.line_user_id is set after every successful login.
 * Existing users that signed in before HAR-661 (or via OIDC) may lack it;
 * without this, middleware/API treat them as unauthenticated for identity.
 */
async function ensureLineIdentity(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  profile: { userId: string; displayName: string; pictureUrl?: string },
) {
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser()
  if (getUserError || !user) {
    throw new Error('LINE authentication did not create a verified session')
  }

  const currentLineId = user.app_metadata?.line_user_id
  if (currentLineId === profile.userId) return

  const adminClient = createAdminClient()
  const { error: updateError } = await adminClient.auth.admin.updateUserById(user.id, {
    app_metadata: {
      ...(user.app_metadata ?? {}),
      ...buildAppMetadata(profile.userId),
    },
    user_metadata: {
      ...(user.user_metadata ?? {}),
      ...buildUserMetadata(profile),
    },
  })
  if (updateError) {
    throw new Error('LINE identity persistence failed')
  }

  // Refresh so subsequent requests see updated JWT claims
  const { error: refreshError } = await supabase.auth.refreshSession()
  if (refreshError) {
    throw new Error('LINE session refresh failed')
  }

  const {
    data: { user: refreshedUser },
    error: verifyError,
  } = await supabase.auth.getUser()
  if (
    verifyError ||
    !refreshedUser ||
    refreshedUser.app_metadata?.line_user_id !== profile.userId
  ) {
    throw new Error('LINE identity could not be verified after persistence')
  }
}

function errorRedirect(baseUrl: string, error: string, returnTo?: string): NextResponse {
  const url = new URL('/', baseUrl)
  url.searchParams.set('auth_error', error)
  if (returnTo && returnTo !== '/') url.searchParams.set('returnTo', getSafeLineRedirectPath(returnTo))
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const cookieStore = await cookies()
  const returnTo = getSafeLineRedirectPath(cookieStore.get('line_auth_redirect')?.value)

  if (error || !code) {
    return errorRedirect(baseUrl, error ?? 'no_code', returnTo)
  }

  const storedState = cookieStore.get('line_auth_state')?.value
  if (!storedState || storedState !== state) {
    return errorRedirect(baseUrl, 'invalid_state', returnTo)
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
      const email = `${profile.userId.toLowerCase()}@line.inkhunt.local`
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
          app_metadata: buildAppMetadata(profile.userId),
        })

        if (createErr) {
          // User exists with old (insecure) password — migrate to HMAC password
          const { error: updateError } = await adminClient.auth.admin.updateUserById(
            // Look up by email: Supabase admin API getUserById doesn't work here,
            // so we use the deterministic email to find the user via listUsers with
            // pagination limited to 1 page. This only runs once per user migration.
            await findUserIdByEmail(adminClient, email),
            { password, user_metadata: metadata, app_metadata: buildAppMetadata(profile.userId) },
          )
          if (updateError) {
            throw new Error('LINE account migration failed')
          }
        }

        // Sign in with the new/updated credentials
        const { error: retryError } = await supabase.auth.signInWithPassword({ email, password })
        if (retryError) {
          throw new Error('LINE password sign-in failed after account provisioning')
        }
      }
    }

    // Always backfill identity into app_metadata after a successful session
    await ensureLineIdentity(supabase, profile)

    // Clean up auth cookies
    cookieStore.delete('line_auth_state')
    cookieStore.delete('line_auth_nonce')
    const redirectTo = getSafeLineRedirectPath(
      cookieStore.get('line_auth_redirect')?.value,
    )
    cookieStore.delete('line_auth_redirect')

    return NextResponse.redirect(new URL(redirectTo, baseUrl))
  } catch (err) {
    reportError('line-callback', err)
    return errorRedirect(baseUrl, 'callback_failed', returnTo)
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
    const {
      data: { users },
      error,
    } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw new Error('LINE account lookup failed')
    }
    const found = users.find((u) => u.email === email)
    if (found) return found.id
    if (users.length < perPage) break
    page++
  }
  throw new Error('User not found for migration')
}
