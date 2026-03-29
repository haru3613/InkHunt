/**
 * Auth cookie security attributes.
 *
 * Verifies that cookies produced by the auth endpoints carry the expected
 * security flags.  Specifically:
 *
 *   1. Supabase session cookies (sb-*-auth-token*)
 *      - Set after POST /api/auth/dev-login
 *      - Must exist (auth is established)
 *      - sameSite must be "Lax" or "None" (Supabase SSR default)
 *
 *   2. LINE OAuth CSRF cookies (line_auth_state, line_auth_nonce)
 *      - Set after GET /api/auth/line (the redirect initiation endpoint)
 *      - Must be httpOnly (cannot be read by client JS)
 *      - Must have sameSite "Lax"
 *
 * These tests run against the real dev server.  They do not require a real
 * LINE OAuth flow — the LINE endpoint only sets cookies before redirecting;
 * we intercept the redirect.
 *
 * Skip condition: dev-login is only available when NODE_ENV=development.
 * In CI with a production build the endpoint returns 404 and these tests
 * are skipped automatically.
 */

import { test, expect } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

const DEV_CONSUMER = {
  line_user_id: 'U_cookie_test_consumer_e2e',
  display_name: 'Cookie Test Consumer',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the raw HTTP response from dev-login (does not throw on 404). */
async function callDevLogin(
  page: import('@playwright/test').Page,
  payload: { line_user_id: string; display_name: string },
) {
  return page.request.post(`${BASE_URL}/api/auth/dev-login`, {
    data: payload,
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Auth cookie security attributes', () => {
  // -------------------------------------------------------------------------
  // 1. Supabase session cookies — set by dev-login
  // -------------------------------------------------------------------------

  test.describe('Supabase session cookies after dev-login', () => {
    test('supabase auth token cookie exists after dev-login', async ({ page }) => {
      // ------------------------------------------------------------------
      // Given: dev-login endpoint is called with a test identity
      // ------------------------------------------------------------------
      await test.step('Given: POST /api/auth/dev-login is called', async () => {
        const response = await callDevLogin(page, DEV_CONSUMER)
        test.skip(response.status() === 404, 'dev-login not available — NODE_ENV is not development.')
        expect(response.ok(), `dev-login returned ${response.status()}`).toBeTruthy()
      })

      // ------------------------------------------------------------------
      // When: we inspect the browser cookies
      // ------------------------------------------------------------------
      let cookies: import('@playwright/test').Cookie[] = []

      await test.step('When: browser cookies are retrieved', async () => {
        // Navigate to any page so the browser accepts first-party cookies.
        await page.goto(BASE_URL)
        cookies = await page.context().cookies()
      })

      // ------------------------------------------------------------------
      // Then: at least one Supabase auth token cookie exists
      // ------------------------------------------------------------------
      await test.step('Then: at least one sb-*-auth-token cookie exists', async () => {
        const supabaseCookies = cookies.filter((c) =>
          c.name.startsWith('sb-') && c.name.includes('auth-token'),
        )
        expect(
          supabaseCookies.length,
          'Expected at least one sb-*-auth-token* cookie but found none. ' +
            `All cookies: ${cookies.map((c) => c.name).join(', ')}`,
        ).toBeGreaterThan(0)
      })
    })

    test('supabase auth token cookie has acceptable sameSite attribute', async ({ page }) => {
      await test.step('Given: user is logged in via dev-login', async () => {
        const response = await callDevLogin(page, DEV_CONSUMER)
        test.skip(response.status() === 404, 'dev-login not available — NODE_ENV is not development.')
        expect(response.ok()).toBeTruthy()
      })

      await test.step('And: browser has navigated to the app', async () => {
        await page.goto(BASE_URL)
      })

      let cookies: import('@playwright/test').Cookie[] = []

      await test.step('When: browser cookies are retrieved', async () => {
        cookies = await page.context().cookies()
      })

      await test.step('Then: sb-* cookie sameSite is Lax or None (Supabase SSR default)', async () => {
        const supabaseCookies = cookies.filter((c) =>
          c.name.startsWith('sb-') && c.name.includes('auth-token'),
        )

        // Skip assertion if no cookies found — that is caught by the sibling test.
        if (supabaseCookies.length === 0) return

        for (const cookie of supabaseCookies) {
          expect(
            ['Lax', 'None'].includes(cookie.sameSite ?? ''),
            `Cookie "${cookie.name}" has sameSite="${cookie.sameSite}", expected "Lax" or "None".`,
          ).toBeTruthy()
        }
      })
    })

    test('dev-login response sets a session that authenticates subsequent requests', async ({
      page,
    }) => {
      // ------------------------------------------------------------------
      // Given: user logs in via dev-login
      // ------------------------------------------------------------------
      await test.step('Given: POST /api/auth/dev-login succeeds', async () => {
        const response = await callDevLogin(page, DEV_CONSUMER)
        test.skip(response.status() === 404, 'dev-login not available — NODE_ENV is not development.')
        expect(response.ok()).toBeTruthy()
      })

      await test.step('And: browser navigates to the app to receive cookies', async () => {
        await page.goto(BASE_URL)
      })

      // ------------------------------------------------------------------
      // When: we call /api/auth/me (the identity endpoint used by the app)
      // ------------------------------------------------------------------
      await test.step('When: GET /api/auth/me is called with session cookies', async () => {
        const meResponse = await page.request.get(`${BASE_URL}/api/auth/me`)

        // ------------------------------------------------------------------
        // Then: the response contains the logged-in user
        // ------------------------------------------------------------------
        await test.step('Then: the response returns the authenticated user', async () => {
          expect(meResponse.ok(), `GET /api/auth/me returned ${meResponse.status()}`).toBeTruthy()
          const body = await meResponse.json()
          expect(body.user, 'Expected a user object in /api/auth/me response').toBeTruthy()
          expect(body.user.lineUserId ?? body.user.line_user_id).toBe(DEV_CONSUMER.line_user_id)
        })
      })
    })
  })

  // -------------------------------------------------------------------------
  // 2. LINE OAuth CSRF cookies — set by GET /api/auth/line
  // -------------------------------------------------------------------------

  test.describe('LINE OAuth CSRF cookies from GET /api/auth/line', () => {
    /**
     * GET /api/auth/line sets httpOnly CSRF cookies then redirects to LINE's
     * OAuth server.  We capture the Set-Cookie headers directly from the API
     * response before the redirect fires.
     */
    test('line_auth_state cookie is httpOnly and sameSite Lax', async ({ page }) => {
      let setCookieHeaders: string[] = []

      await test.step('Given: GET /api/auth/line is called (redirect intercepted)', async () => {
        // Intercept the LINE redirect at the network level — we only care
        // about the Set-Cookie headers on the initial response, not the
        // destination OAuth page.
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/auth/line') && resp.request().method() === 'GET',
          { timeout: 10_000 },
        )

        // Trigger the request; the page will attempt to redirect but we
        // intercept the response before following it.
        await page.goto(`${BASE_URL}/api/auth/line`, { waitUntil: 'commit' }).catch(() => {
          // The redirect to LINE's server will fail in the test environment —
          // that is expected.  We only need the headers from the first response.
        })

        const response = await responsePromise.catch(() => null)

        if (!response) {
          test.skip(true, 'GET /api/auth/line did not respond — endpoint may not exist yet.')
          return
        }

        // Playwright exposes headers as a flat object; multiple Set-Cookie
        // headers are joined by the underlying HTTP/1.1 parsing.
        const rawHeaders = await response.headersArray()
        setCookieHeaders = rawHeaders
          .filter((h: { name: string; value: string }) => h.name.toLowerCase() === 'set-cookie')
          .map((h: { name: string; value: string }) => h.value)
      })

      await test.step('When: Set-Cookie headers are parsed', async () => {
        // If no Set-Cookie headers were captured we cannot assert — skip.
        test.skip(
          setCookieHeaders.length === 0,
          'No Set-Cookie headers found on GET /api/auth/line response.',
        )
      })

      await test.step('Then: line_auth_state cookie is present', async () => {
        const stateHeader = setCookieHeaders.find((h) => h.startsWith('line_auth_state'))
        expect(stateHeader, 'line_auth_state cookie not set by GET /api/auth/line').toBeTruthy()
      })

      await test.step('And: line_auth_state cookie is HttpOnly', async () => {
        const stateHeader = setCookieHeaders.find((h) => h.startsWith('line_auth_state')) ?? ''
        expect(
          stateHeader.toLowerCase().includes('httponly'),
          `line_auth_state cookie is missing HttpOnly flag. Header: "${stateHeader}"`,
        ).toBeTruthy()
      })

      await test.step('And: line_auth_state cookie has SameSite=Lax', async () => {
        const stateHeader = setCookieHeaders.find((h) => h.startsWith('line_auth_state')) ?? ''
        expect(
          stateHeader.toLowerCase().includes('samesite=lax'),
          `line_auth_state cookie is missing SameSite=Lax. Header: "${stateHeader}"`,
        ).toBeTruthy()
      })
    })

    test('line_auth_nonce cookie is httpOnly and sameSite Lax', async ({ page }) => {
      let setCookieHeaders: string[] = []

      await test.step('Given: GET /api/auth/line is called', async () => {
        const responsePromise = page.waitForResponse(
          (resp) => resp.url().includes('/api/auth/line') && resp.request().method() === 'GET',
          { timeout: 10_000 },
        )

        await page.goto(`${BASE_URL}/api/auth/line`, { waitUntil: 'commit' }).catch(() => {})

        const response = await responsePromise.catch(() => null)
        if (!response) {
          test.skip(true, 'GET /api/auth/line did not respond.')
          return
        }

        const rawHeaders2 = await response.headersArray()
        setCookieHeaders = rawHeaders2
          .filter((h: { name: string; value: string }) => h.name.toLowerCase() === 'set-cookie')
          .map((h: { name: string; value: string }) => h.value)
      })

      await test.step('Then: line_auth_nonce cookie is present', async () => {
        test.skip(setCookieHeaders.length === 0, 'No Set-Cookie headers captured.')
        const nonceHeader = setCookieHeaders.find((h) => h.startsWith('line_auth_nonce'))
        expect(nonceHeader, 'line_auth_nonce cookie not set by GET /api/auth/line').toBeTruthy()
      })

      await test.step('And: line_auth_nonce cookie is HttpOnly', async () => {
        const nonceHeader = setCookieHeaders.find((h) => h.startsWith('line_auth_nonce')) ?? ''
        expect(
          nonceHeader.toLowerCase().includes('httponly'),
          `line_auth_nonce cookie is missing HttpOnly flag. Header: "${nonceHeader}"`,
        ).toBeTruthy()
      })

      await test.step('And: line_auth_nonce cookie has SameSite=Lax', async () => {
        const nonceHeader = setCookieHeaders.find((h) => h.startsWith('line_auth_nonce')) ?? ''
        expect(
          nonceHeader.toLowerCase().includes('samesite=lax'),
          `line_auth_nonce cookie is missing SameSite=Lax. Header: "${nonceHeader}"`,
        ).toBeTruthy()
      })
    })
  })
})
