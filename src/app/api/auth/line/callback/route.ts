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
  console.log('[LINE CB] State check:', { storedState: storedState?.slice(0, 8), urlState: state?.slice(0, 8), match: storedState === state })
  if (!storedState || storedState !== state) {
    console.error('[LINE CB] State mismatch! Cookie missing or tampered.')
    return NextResponse.redirect(`${baseUrl}?auth_error=invalid_state`)
  }

  try {
    console.log('[LINE CB] Step 1: exchanging code for tokens...')
    const tokens = await exchangeCodeForTokens(code)
    console.log('[LINE CB] Step 2: got tokens, fetching profile...')
    const profile = await getLineProfile(tokens.access_token)
    console.log('[LINE CB] Step 3: profile:', profile.userId, profile.displayName)

    // Try Supabase OIDC sign-in first
    const supabase = await createServerClient()
    console.log('[LINE CB] Step 4: trying signInWithIdToken...')
    const { error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'kakao',
      token: tokens.id_token,
      nonce: cookieStore.get('line_auth_nonce')?.value ?? '',
    })

    if (authError) {
      console.log('[LINE CB] Step 5: OIDC failed:', authError.message, '- using admin fallback')
      // Fallback: admin-based sign-in for LINE (not natively supported by Supabase)
      const adminClient = createAdminClient()
      const email = `${profile.userId}@line.inkhunt.local`

      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(
        (u) => u.user_metadata?.line_user_id === profile.userId,
      )

      if (!existingUser) {
        console.log('[LINE CB] Step 6a: creating new user...')
        const { error: createErr } = await adminClient.auth.admin.createUser({
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
        if (createErr) console.error('[LINE CB] create user error:', createErr.message)
      } else {
        console.log('[LINE CB] Step 6b: updating existing user...')
        const { error: updateErr } = await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: profile.userId,
          user_metadata: {
            line_user_id: profile.userId,
            name: profile.displayName,
            picture: profile.pictureUrl,
            sub: profile.userId,
          },
        })
        if (updateErr) console.error('[LINE CB] update user error:', updateErr.message)
      }

      console.log('[LINE CB] Step 7: signing in with password...')
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password: profile.userId,
      })
      if (signInErr) console.error('[LINE CB] signInWithPassword error:', signInErr.message)
      else console.log('[LINE CB] Step 8: sign-in success!')
    } else {
      console.log('[LINE CB] Step 5: OIDC sign-in success!')
    }

    // Clean up auth cookies
    cookieStore.delete('line_auth_state')
    cookieStore.delete('line_auth_nonce')
    const redirectTo = cookieStore.get('line_auth_redirect')?.value ?? '/'
    cookieStore.delete('line_auth_redirect')

    console.log('[LINE CB] Done! Redirecting to:', redirectTo)
    return NextResponse.redirect(`${baseUrl}${redirectTo}`)
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Unknown callback error'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[LINE CB] FATAL ERROR:', message)
    console.error('[LINE CB] Stack:', stack)
    return NextResponse.redirect(`${baseUrl}?auth_error=callback_failed`)
  }
}
