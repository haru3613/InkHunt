import { test as base, type Page } from '@playwright/test'
import { API_RESPONSES, TEST_INQUIRY, TEST_MESSAGES, TEST_QUOTE } from './test-data'

type ApiMockFixtures = {
  /** Set up route interception for client-side API calls */
  mockApis: void
}

async function setupApiMocks(page: Page) {
  // Inquiry list (consumer view)
  await page.route('**/api/inquiries', (route) => {
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
  })

  // Inquiry detail
  await page.route('**/api/inquiries/*', (route) => {
    const url = route.request().url()

    // Messages endpoint
    if (url.includes('/messages')) {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(TEST_MESSAGES),
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
    return route.continue()
  })

  // Upload signed URL
  await page.route('**/api/upload/signed-url', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        signedUrl: 'https://example.com/upload',
        path: 'portfolio/test-image.jpg',
        publicUrl: 'https://example.com/public/test-image.jpg',
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
