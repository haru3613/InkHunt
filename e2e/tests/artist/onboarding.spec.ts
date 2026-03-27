import { test, expect } from '../../fixtures'
import { ArtistEntryPage } from '../../pages/artist-entry.page'

test.describe('Artist Journey: Onboarding', () => {
  test('shows login prompt when unauthenticated', async ({ publicPage }) => {
    const page = new ArtistEntryPage(publicPage)

    await test.step('Given: an unauthenticated visitor navigates to /artist', async () => {
      await page.goto()
    })

    await test.step('Then: the page title is "刺青師後台"', async () => {
      await expect(page.pageTitle()).toBeVisible()
    })

    await test.step('And: a LINE login button is shown', async () => {
      await expect(page.loginButton()).toBeVisible()
    })

    await test.step('And: no application or dashboard content is shown', async () => {
      await expect(page.startApplicationButton()).not.toBeVisible()
      await expect(page.reviewStatusHeading()).not.toBeVisible()
    })
  })

  test('shows application form for new users', async ({ newUserPage }) => {
    const page = new ArtistEntryPage(newUserPage)

    await test.step('Given: a logged-in user with no artist profile navigates to /artist', async () => {
      await page.goto()
    })

    await test.step('Then: the heading "成為 InkHunt 刺青師" is visible', async () => {
      await expect(page.newUserTitle()).toBeVisible()
    })

    await test.step('And: the "開始申請" button is visible', async () => {
      await expect(page.startApplicationButton()).toBeVisible()
    })

    await test.step('And: the LINE login button is not shown', async () => {
      await expect(page.loginButton()).not.toBeVisible()
    })
  })

  test('shows review status for pending artists', async ({ pendingArtistPage }) => {
    const page = new ArtistEntryPage(pendingArtistPage)

    await test.step('Given: a logged-in artist whose application is pending navigates to /artist', async () => {
      await page.goto()
    })

    await test.step('Then: the "申請審核中" heading is visible', async () => {
      await expect(page.reviewStatusHeading()).toBeVisible()
    })

    await test.step('And: neither the login button nor the application CTA is shown', async () => {
      await expect(page.loginButton()).not.toBeVisible()
      await expect(page.startApplicationButton()).not.toBeVisible()
    })
  })
})
