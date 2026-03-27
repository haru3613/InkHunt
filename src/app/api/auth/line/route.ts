import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getLineAuthUrl } from '@/lib/line/auth'

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirect') ?? '/'
  const { url, state, nonce } = getLineAuthUrl()

  const cookieStore = await cookies()
  const cookieOptions = {
    httpOnly: true,
    secure: true,
    maxAge: 600,
    path: '/',
  } as const
  cookieStore.set('line_auth_state', state, cookieOptions)
  cookieStore.set('line_auth_nonce', nonce, cookieOptions)
  cookieStore.set('line_auth_redirect', redirectTo, cookieOptions)

  return NextResponse.redirect(url)
}
