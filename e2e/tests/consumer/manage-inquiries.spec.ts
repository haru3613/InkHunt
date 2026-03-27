import { test, expect } from '../../fixtures'
import { InquiriesListPage } from '../../pages/inquiries-list.page'
import { ChatPage } from '../../pages/chat.page'
import { API_RESPONSES, TEST_INQUIRY, TEST_QUOTE } from '../../fixtures/test-data'

/**
 * Consumer journey: browse existing inquiries and interact with the chat.
 *
 * Relies on the api-mocks fixture (auto-applied) which intercepts:
 *   GET  /api/inquiries           → { data: API_RESPONSES.inquiryList }
 *   GET  /api/inquiries/:id       → API_RESPONSES.inquiryDetail (messages + quotes)
 *   POST /api/inquiries/:id/messages  → 201 with new message
 *   PATCH /api/inquiries/:id/quotes   → 200 with { status: "accepted" }
 *
 * All tests use `consumerPage` — the auth mock returns an authenticated
 * consumer session so the page renders its content rather than redirecting.
 */
test.describe('Consumer: manage inquiries', () => {
  test('shows inquiry list with artist info', async ({ consumerPage }) => {
    const listPage = new InquiriesListPage(consumerPage)

    await test.step('Given: the consumer navigates to their inquiry list', async () => {
      await listPage.open()
    })

    await test.step('Then: the page heading is visible', async () => {
      await expect(listPage.pageTitle()).toBeVisible()
    })

    await test.step('And: at least one inquiry item is displayed', async () => {
      const items = listPage.inquiryItems()
      await expect(items.first()).toBeVisible()
    })

    await test.step('And: the inquiry shows the artist display name', async () => {
      const artistName = API_RESPONSES.inquiryList[0].artist_display_name
      const item = listPage.getInquiryByArtist(artistName)
      await expect(item).toBeVisible()
    })

    await test.step('And: the inquiry shows a message preview', async () => {
      const item = listPage.getInquiryByArtist(
        API_RESPONSES.inquiryList[0].artist_display_name,
      )
      await expect(item).toContainText(TEST_INQUIRY.description)
    })
  })

  test('can view chat and see messages and quote', async ({ consumerPage }) => {
    const listPage = new InquiriesListPage(consumerPage)
    const chatPage = new ChatPage(consumerPage)

    await test.step('Given: the consumer is on the inquiry list page', async () => {
      await listPage.open()
    })

    await test.step('When: the consumer opens an inquiry', async () => {
      const artistName = API_RESPONSES.inquiryList[0].artist_display_name
      await listPage.openInquiry(artistName)
    })

    await test.step('Then: the chat page shows the artist name in the header', async () => {
      const artistName = API_RESPONSES.inquiryList[0].artist_display_name
      await expect(chatPage.artistNameHeading()).toContainText(artistName)
    })

    await test.step('And: the consumer message is visible in the chat', async () => {
      await expect(chatPage.messageByText('你好，想詢問這個圖案')).toBeVisible()
    })

    await test.step('And: the artist reply message is visible in the chat', async () => {
      await expect(chatPage.messageByText('你好！這個圖案可以做')).toBeVisible()
    })

    await test.step('And: the quote card is visible with the correct price', async () => {
      const formattedPrice = `NT$${TEST_QUOTE.price.toLocaleString()}`
      await expect(consumerPage.getByText(formattedPrice)).toBeVisible()
    })

    await test.step('And: the quote card shows the accept and reject buttons', async () => {
      await expect(chatPage.acceptQuoteButton()).toBeVisible()
      await expect(chatPage.rejectQuoteButton()).toBeVisible()
    })

    await test.step('And: the chat input is available for sending messages', async () => {
      await expect(chatPage.chatInput()).toBeVisible()
    })
  })
})
