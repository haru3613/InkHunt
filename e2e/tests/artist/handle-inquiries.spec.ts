import { test, expect } from '../../fixtures'
import { ArtistDashboardPage } from '../../pages/artist-dashboard.page'
import { TEST_CONSUMER } from '../../fixtures/test-data'

test.describe('Artist Journey: Handle Inquiries', () => {
  test('shows inquiry list on dashboard', async ({ artistPage }) => {
    const dashboard = new ArtistDashboardPage(artistPage)

    await test.step('Given: an active artist navigates to /artist/dashboard', async () => {
      await dashboard.goto()
    })

    await test.step('Then: the "詢價管理" title is visible', async () => {
      await expect(dashboard.dashboardTitle()).toBeVisible()
    })

    await test.step('And: at least one inquiry item from the mock data is shown', async () => {
      // The API mock returns a single inquiry from TEST_CONSUMER
      await expect(
        dashboard.inquiryItem(TEST_CONSUMER.displayName),
      ).toBeVisible()
    })
  })

  test('can view and reply to inquiry', async ({ artistPage }) => {
    const dashboard = new ArtistDashboardPage(artistPage)

    await test.step('Given: an active artist is on the dashboard with a visible inquiry', async () => {
      await dashboard.goto()
      await expect(dashboard.inquiryItem(TEST_CONSUMER.displayName)).toBeVisible()
    })

    await test.step('When: they click the inquiry item', async () => {
      await dashboard.openInquiry(TEST_CONSUMER.displayName)
    })

    await test.step('Then: the chat window is visible', async () => {
      // After selecting an inquiry the ChatWindow renders in the right panel.
      // The message input is the clearest indicator the window has mounted.
      await expect(dashboard.chatInput()).toBeVisible()
    })

    await test.step('When: they type a reply message', async () => {
      await dashboard.chatInput().fill('收到，稍後確認時間後回覆你')
    })

    await test.step('And: they send it by pressing Enter', async () => {
      await dashboard.sendMessage('收到，稍後確認時間後回覆你')
    })

    await test.step('Then: the input field is cleared after sending', async () => {
      await expect(dashboard.chatInput()).toHaveValue('')
    })
  })
})
