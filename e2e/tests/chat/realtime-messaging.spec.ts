/**
 * Realtime messaging — dual browser context test.
 *
 * REQUIREMENTS:
 *   - A running Next.js dev server (`npm run dev`)
 *   - A real Supabase project with Realtime enabled (not mocked)
 *   - Environment variables set in .env.local:
 *       NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 *   - An existing inquiry row in the DB whose ID is REALTIME_INQUIRY_ID
 *
 * The hook `useRealtimeMessages` subscribes to `postgres_changes` INSERT
 * events on the `messages` table filtered by `inquiry_id`.  This test
 * proves that a message written by the consumer context propagates to the
 * artist context via Supabase Realtime WITHOUT the artist page refreshing.
 *
 * Skip conditions:
 *   - NEXT_PUBLIC_SUPABASE_URL is not set (mocked environment)
 *   - REALTIME_INQUIRY_ID is not set (no fixture data available)
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { ChatPage } from '../../pages/chat.page'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const LOCALE = 'zh-TW'

/** The inquiry both users will open.  Set via env var so CI can inject a
 *  stable fixture row without hardcoding a UUID in source. */
const REALTIME_INQUIRY_ID = process.env.REALTIME_INQUIRY_ID ?? ''

/** dev-login identities — these must exist (or be created) in the DB. */
const CONSUMER_LINE_ID = 'U_realtime_consumer_e2e'
const ARTIST_LINE_ID = 'U_realtime_artist_e2e'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Call /api/auth/dev-login and store the resulting session cookies on `page`.
 * Only available when NODE_ENV=development.
 */
async function devLogin(page: Page, lineUserId: string, displayName: string): Promise<void> {
  const response = await page.request.post(`${BASE_URL}/api/auth/dev-login`, {
    data: { line_user_id: lineUserId, display_name: displayName },
  })

  if (!response.ok()) {
    throw new Error(
      `dev-login failed for ${displayName} (${lineUserId}): HTTP ${response.status()}. ` +
        'Ensure the dev server is running with NODE_ENV=development.',
    )
  }
}

/**
 * Navigate to the inquiry chat page and wait until the message list is ready.
 * Uses the locale-prefixed path that BasePage.goto() would produce.
 */
async function openChat(page: Page, inquiryId: string): Promise<ChatPage> {
  const chatPage = new ChatPage(page)
  await chatPage.open(inquiryId)
  return chatPage
}

// ---------------------------------------------------------------------------
// Skip guard — evaluated at collection time (before any test runs)
// ---------------------------------------------------------------------------

const missingSupabaseUrl = !process.env.NEXT_PUBLIC_SUPABASE_URL
const missingInquiryId = !REALTIME_INQUIRY_ID

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Realtime messaging — dual browser context', () => {
  // Declare contexts / pages at describe scope so afterAll can close them.
  let consumerContext: BrowserContext
  let artistContext: BrowserContext
  let consumerPage: Page
  let artistPage: Page

  test.beforeAll(async ({ browser }) => {
    // Each context is an isolated browser session (separate cookies / storage).
    consumerContext = await browser.newContext()
    artistContext = await browser.newContext()
    consumerPage = await consumerContext.newPage()
    artistPage = await artistContext.newPage()
  })

  test.afterAll(async () => {
    await consumerContext?.close()
    await artistContext?.close()
  })

  test(
    'consumer message appears on artist screen without page reload',
    async () => {
      // ------------------------------------------------------------------
      // Skip when environment is not wired up for realtime testing.
      // ------------------------------------------------------------------
      test.skip(
        missingSupabaseUrl,
        'NEXT_PUBLIC_SUPABASE_URL not set — realtime test requires a real Supabase connection.',
      )
      test.skip(
        missingInquiryId,
        'REALTIME_INQUIRY_ID not set — provide the UUID of an existing inquiry fixture row.',
      )

      // ------------------------------------------------------------------
      // Given: consumer and artist are both logged in via dev-login
      // ------------------------------------------------------------------
      await test.step('Given: consumer logs in via dev-login', async () => {
        await devLogin(consumerPage, CONSUMER_LINE_ID, 'E2E Consumer')
      })

      await test.step('And: artist logs in via dev-login', async () => {
        await devLogin(artistPage, ARTIST_LINE_ID, 'E2E Artist')
      })

      // ------------------------------------------------------------------
      // And: both navigate to the same inquiry chat page
      // ------------------------------------------------------------------
      let consumerChat: ChatPage
      let artistChat: ChatPage

      await test.step('And: consumer opens the inquiry chat', async () => {
        consumerChat = await openChat(consumerPage, REALTIME_INQUIRY_ID)
        // Confirm the chat input is ready before proceeding.
        await expect(consumerChat.chatInput()).toBeVisible()
      })

      await test.step('And: artist opens the same inquiry chat', async () => {
        artistChat = await openChat(artistPage, REALTIME_INQUIRY_ID)
        // Confirm the artist is also fully loaded.
        await expect(artistChat.chatInput()).toBeVisible()
      })

      // ------------------------------------------------------------------
      // When: consumer sends a text message
      // ------------------------------------------------------------------
      const uniqueText = `Realtime test message — ${Date.now()}`

      await test.step('When: consumer sends a message', async () => {
        await consumerChat!.sendMessage(uniqueText)
        // The input clears after a successful send (sendMessage waits for this).
        await expect(consumerChat!.chatInput()).toHaveValue('')
      })

      // ------------------------------------------------------------------
      // Then: the same message text appears on the artist's page
      //       WITHOUT the artist page refreshing.
      //
      // useRealtimeMessages appends the new message via the postgres_changes
      // subscription; if Realtime is working, this should resolve well within
      // 5 seconds under normal network conditions.
      // ------------------------------------------------------------------
      await test.step('Then: artist sees the message without reloading', async () => {
        await expect(artistChat!.messageByText(uniqueText)).toBeVisible({
          timeout: 5_000,
        })
      })

      await test.step('And: consumer also sees their own message in the chat', async () => {
        await expect(consumerChat!.messageByText(uniqueText)).toBeVisible()
      })
    },
  )

  test(
    'artist message appears on consumer screen without page reload',
    async () => {
      test.skip(missingSupabaseUrl, 'NEXT_PUBLIC_SUPABASE_URL not set.')
      test.skip(missingInquiryId, 'REALTIME_INQUIRY_ID not set.')

      // ------------------------------------------------------------------
      // Given: both users are already logged in (re-uses session from
      //        beforeAll; login state persists within the browser context).
      // ------------------------------------------------------------------
      let consumerChat: ChatPage
      let artistChat: ChatPage

      await test.step('Given: both users are on the inquiry chat page', async () => {
        consumerChat = await openChat(consumerPage, REALTIME_INQUIRY_ID)
        artistChat = await openChat(artistPage, REALTIME_INQUIRY_ID)
        await expect(consumerChat.chatInput()).toBeVisible()
        await expect(artistChat.chatInput()).toBeVisible()
      })

      // ------------------------------------------------------------------
      // When: artist sends a reply
      // ------------------------------------------------------------------
      const uniqueReply = `Artist reply — ${Date.now()}`

      await test.step('When: artist sends a message', async () => {
        await artistChat!.sendMessage(uniqueReply)
        await expect(artistChat!.chatInput()).toHaveValue('')
      })

      // ------------------------------------------------------------------
      // Then: consumer sees the reply in real-time
      // ------------------------------------------------------------------
      await test.step('Then: consumer sees the artist reply without reloading', async () => {
        await expect(consumerChat!.messageByText(uniqueReply)).toBeVisible({
          timeout: 5_000,
        })
      })
    },
  )
})
