import { type NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/middleware'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip i18n for API routes
  if (pathname.startsWith('/api/')) {
    return await updateSession(request)
  }

  // Handle i18n locale detection and redirect
  const intlResponse = intlMiddleware(request)

  // If intl middleware returns a redirect, return it directly
  if (intlResponse.headers.get('location')) {
    return intlResponse
  }

  // Otherwise chain with Supabase session refresh
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
