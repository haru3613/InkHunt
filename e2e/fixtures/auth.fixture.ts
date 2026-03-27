import { test as base, type Page } from '@playwright/test'
import { API_RESPONSES } from './test-data'

type AuthFixtures = {
  /** Unauthenticated page — for public browsing */
  publicPage: Page
  /** Authenticated consumer — for inquiries and chat */
  consumerPage: Page
  /** Authenticated artist (active) — for dashboard */
  artistPage: Page
  /** Authenticated artist (pending) — for onboarding review */
  pendingArtistPage: Page
  /** Authenticated user with no artist profile — for "become artist" flow */
  newUserPage: Page
}

function setupAuthMock(page: Page, authResponse: object) {
  return page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(authResponse),
    }),
  )
}

export const test = base.extend<AuthFixtures>({
  publicPage: async ({ page }, use) => {
    await setupAuthMock(page, API_RESPONSES.authPublic)
    await use(page)
  },

  consumerPage: async ({ page }, use) => {
    await setupAuthMock(page, API_RESPONSES.authConsumer)
    await use(page)
  },

  artistPage: async ({ page }, use) => {
    await setupAuthMock(page, API_RESPONSES.authArtist)
    await use(page)
  },

  pendingArtistPage: async ({ page }, use) => {
    await setupAuthMock(page, API_RESPONSES.authPendingArtist)
    await use(page)
  },

  newUserPage: async ({ page }, use) => {
    await setupAuthMock(page, API_RESPONSES.authNewUser)
    await use(page)
  },
})
