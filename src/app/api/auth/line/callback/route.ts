import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getLineProfile } from '@/lib/line/auth'

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
      const adminClient = createAdminClient()
      const email = `${profile.userId}@line.inkhunt.local`

      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(
        (u) => u.user_metadata?.line_user_id === profile.userId,
      )

      if (!existingUser) {
        await adminClient.auth.admin.createUser({
          email,
          password: profile.userId,
          email_confirm: true,
          user_metadata: {
            line_user_id: profile.userId,
            name: profile.displayName,
            picture: profile.pictureUrl,
            sub: profile.userId,
            provider: 'line',
          },
        })
      } else {
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: profile.userId,
          user_metadata: {
            line_user_id: profile.userId,
            name: profile.displayName,
            picture: profile.pictureUrl,
            sub: profile.userId,
          },
        })
      }

      await supabase.auth.signInWithPassword({
        email,
        password: profile.userId,
      })
    }

    // Clean up auth cookies
    cookieStore.delete('line_auth_state')
    cookieStore.delete('line_auth_nonce')
    const redirectTo = cookieStore.get('line_auth_redirect')?.value ?? '/'
    cookieStore.delete('line_auth_redirect')

    return NextResponse.redirect(`${baseUrl}${redirectTo}`)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown callback error'
    console.error('LINE callback error:', message)
    return NextResponse.redirect(`${baseUrl}?auth_error=callback_failed`)
  }
}
