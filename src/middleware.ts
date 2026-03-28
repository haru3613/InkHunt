import { NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware(routing)

const PROTECTED_ARTIST_ROUTES =
  /^(\/[a-z-]+)?\/artist\/(dashboard|profile|portfolio|calendar|clients|settings|stats)/

const PROTECTED_ADMIN_ROUTES = /^(\/[a-z-]+)?\/admin/

const PROTECTED_API_ROUTES = [
  { pattern: /^\/api\/inquiries$/, methods: ['POST'] },
  { pattern: /^\/api\/inquiries\/[^/]+\/messages$/, methods: ['POST'] },
  { pattern: /^\/api\/inquiries\/[^/]+\/quotes$/, methods: ['POST'] },
  { pattern: /^\/api\/upload\/signed-url$/, methods: ['POST'] },
]

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // E2E test mode: skip auth redirects, auth is mocked at the API layer
  if (process.env.E2E_AUTH_BYPASS === 'true' && !pathname.startsWith('/api/')) {
    const intlResponse = intlMiddleware(request)
    if (intlResponse.headers.get('location')) return intlResponse
    response.headers.forEach((value, key) => {
      if (key !== 'content-type') intlResponse.headers.set(key, value)
    })
    return intlResponse
  }

  // Skip i18n for API routes
  if (pathname.startsWith('/api/')) {
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

  // Apply i18n middleware for non-API routes
  const intlResponse = intlMiddleware(request)

  if (intlResponse.headers.get('location')) {
    return intlResponse
  }

  // Merge Supabase session cookies into i18n response
  response.headers.forEach((value, key) => {
    if (key !== 'content-type') {
      intlResponse.headers.set(key, value)
    }
  })

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)',
  ],
}
