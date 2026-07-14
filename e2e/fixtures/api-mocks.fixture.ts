import { test as base, type Page, type Route } from '@playwright/test'
import {
  API_RESPONSES,
  TEST_ARTIST_PROFILE,
  TEST_INQUIRY,
  TEST_MESSAGES,
  TEST_QUOTE,
} from './test-data'

type ApiMockFixtures = {
  /** Set up route interception for client-side API calls */
  mockApis: void
}

/** Full artist detail shape returned by GET /api/artists/:slug and echoed
 *  back (merged with the request body) by PATCH, so ProfileForm always has a
 *  deterministic artist to edit instead of depending on a real Supabase row. */
const ARTIST_DETAIL = {
  ...TEST_ARTIST_PROFILE,
  bio: '專注於寫實與肖像風格',
  city: '台北市',
  district: null,
  address: null,
  price_min: 3000,
  price_max: 20000,
  ig_handle: '@inkmaster_alex',
  pricing_note: null,
  booking_notice: null,
  avatar_url: null,
  styles: [],
}

function inquiryListHandler(route: Route) {
  if (route.request().method() === 'GET') {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: API_RESPONSES.inquiryList, total: API_RESPONSES.inquiryList.length }),
    })
  }
  // POST — create inquiry
  return route.fulfill({
    status: 201,
    contentType: 'application/json',
    body: JSON.stringify({ ...TEST_INQUIRY, id: 'inquiry-new' }),
  })
}

async function setupApiMocks(page: Page) {
  // Inquiry list (consumer/artist view). Playwright globs don't match query
  // strings against `**/api/inquiries` alone (the pattern is anchored), so the
  // app's actual calls (`/api/inquiries?role=artist|consumer`) need a second
  // route registered explicitly for the `?query` variant.
  await page.route('**/api/inquiries', inquiryListHandler)
  await page.route('**/api/inquiries?*', inquiryListHandler)

  // Inquiry detail + nested resources (messages, quotes). `**` is required
  // (not `*`) so it matches multi-segment paths like `/inquiries/:id/messages`.
  await page.route('**/api/inquiries/**', (route) => {
    const url = route.request().url()

    // Messages endpoint
    if (url.includes('/messages')) {
      if (route.request().method() === 'GET') {
        // HAR-665: the real route (src/app/api/inquiries/[id]/messages/route.ts)
        // responds with `{ messages }`, not a bare array — useRealtimeMessages
        // reads `data.messages`, so the bare-array shape silently produced an
        // empty chat.
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ messages: TEST_MESSAGES }),
        })
      }
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'msg-new',
          inquiry_id: 'inquiry-001',
          content: 'New message',
          message_type: 'text',
          created_at: new Date().toISOString(),
        }),
      })
    }

    // Quotes endpoint
    if (url.includes('/quotes')) {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(TEST_QUOTE),
        })
      }
      // PATCH — accept/reject quote
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...TEST_QUOTE, status: 'accepted' }),
      })
    }

    // Inquiry detail (GET/PATCH)
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(API_RESPONSES.inquiryDetail),
    })
  })

  // Artist API routes (for artist dashboard)
  await page.route('**/api/artists', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'artist-new', slug: 'new-artist' }),
      })
    }
    return route.continue()
  })

  await page.route('**/api/artists/*/portfolio', (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'portfolio-new' }),
      })
    }
    if (route.request().method() === 'GET') {
      // Deterministic non-empty grid so /artist/portfolio doesn't depend on a
      // real seeded artist row (TEST_ARTIST_PROFILE.slug has none). Specs
      // that need a specific list (e.g. portfolio-reorder.spec.ts) register
      // their own route for this pattern, which takes priority (LIFO).
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'portfolio-001', artist_id: TEST_ARTIST_PROFILE.id, image_url: 'https://picsum.photos/seed/p1/400/400', thumbnail_url: null, title: 'Fine line rose', description: null, body_part: null, size_cm: null, style_id: null, healed_image_url: null, sort_order: 0, created_at: '2026-01-01T00:00:00Z' },
          ],
        }),
      })
    }
    return route.continue()
  })

  // Quote templates (fetched by both the profile page and the inquiries page)
  await page.route('**/api/artists/me/templates', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ templates: [] }),
    }),
  )

  // Style list (fetched by the profile page to render style toggles)
  await page.route('**/api/styles', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    }),
  )

  // Single artist detail — GET populates the profile form, PATCH is the
  // profile save endpoint. Without this, ProfileForm never receives an
  // `artist`, falls back to the POST-only "new artist" branch, and the save
  // request hits the real (unmocked) server.
  await page.route('**/api/artists/*', (route) => {
    const method = route.request().method()
    if (method === 'PATCH') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ...ARTIST_DETAIL, ...body }),
      })
    }
    if (method === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(ARTIST_DETAIL),
      })
    }
    return route.continue()
  })

  // Upload signed URL — real API returns snake_case (see src/lib/upload/storage.ts)
  await page.route('**/api/upload/signed-url', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signed_url: 'https://example.com/upload',
        path: 'portfolio/test-image.jpg',
        public_url: 'https://example.com/public/test-image.jpg',
      }),
    }),
  )
}

export const test = base.extend<ApiMockFixtures>({
  mockApis: [
    async ({ page }, use) => {
      await setupApiMocks(page)
      await use()
    },
    { auto: true },
  ],
})
