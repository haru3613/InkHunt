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

  const intlResponse = intlMiddleware(request)

  if (intlResponse.headers.get('location')) {
    return intlResponse
  }

  const supabaseResponse = await updateSession(request)

  intlResponse.headers.forEach((value, key) => {
    if (key !== 'content-type') {
      supabaseResponse.headers.set(key, value)
    }
  })

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
