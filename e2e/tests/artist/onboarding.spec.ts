import { test, expect } from '../../fixtures'
import { ArtistEntryPage } from '../../pages/artist-entry.page'

test.describe('Artist Journey: Onboarding', () => {
  test('shows login prompt when unauthenticated', async ({ publicPage }) => {
    const page = new ArtistEntryPage(publicPage)

    await test.step('Given: an unauthenticated visitor navigates to /artist', async () => {
      await page.goto()
    })

    await test.step('Then: the page title is "在 InkHunt 展示你的作品"', async () => {
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

  test('redirects new users to the onboarding wizard', async ({ newUserPage }) => {
    // HAR-665: /artist has no inline "application form" for new users — its
    // useEffect (src/app/[locale]/(artist)/artist/page.tsx) redirects a
    // logged-in user with no artist profile to /artist/onboarding, which
    // renders <OnboardingWizard> starting at step 1 (StepBasicInfo).
    const page = new ArtistEntryPage(newUserPage)

    await test.step('Given: a logged-in user with no artist profile navigates to /artist', async () => {
      await page.goto()
    })

    await test.step('Then: they are redirected to /artist/onboarding', async () => {
      await newUserPage.waitForURL(/\/artist\/onboarding$/)
    })

    await test.step('And: the onboarding page heading is visible', async () => {
      await expect(
        newUserPage.getByRole('heading', { name: '建立你的刺青師檔案', level: 1 }),
      ).toBeVisible()
    })

    await test.step('And: step 1 of the wizard (基本資料) is rendered', async () => {
      await expect(newUserPage.getByRole('heading', { name: '基本資料', level: 2 })).toBeVisible()
      await expect(newUserPage.getByText('藝名 / 名字')).toBeVisible()
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
