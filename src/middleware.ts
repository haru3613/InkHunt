import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_ARTIST_ROUTES =
  /^\/artist\/(dashboard|profile|portfolio|calendar|clients|settings|stats)/

const PROTECTED_ADMIN_ROUTES = /^\/admin/

const PROTECTED_API_ROUTES = [
  { pattern: /^\/api\/inquiries$/, methods: ['POST'] },
  { pattern: /^\/api\/inquiries\/[^/]+\/messages$/, methods: ['POST'] },
  { pattern: /^\/api\/inquiries\/[^/]+\/quotes$/, methods: ['POST'] },
  { pattern: /^\/api\/upload\/signed-url$/, methods: ['POST'] },
]

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Artist dashboard routes require authentication
  if (PROTECTED_ARTIST_ROUTES.test(pathname)) {
    if (!user) {
      const loginUrl = new URL('/api/auth/line', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
  }

  // Admin routes require authentication + admin role
  if (PROTECTED_ADMIN_ROUTES.test(pathname)) {
    if (!user) {
      const loginUrl = new URL('/api/auth/line', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const adminIds = process.env.ADMIN_LINE_USER_IDS?.split(',') ?? []
    const lineUserId =
      user.user_metadata?.sub ?? user.user_metadata?.line_user_id
    if (!lineUserId || !adminIds.includes(lineUserId)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Protected API routes require authentication
  for (const route of PROTECTED_API_ROUTES) {
    if (
      route.pattern.test(pathname) &&
      route.methods.includes(request.method)
    ) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
