import { test, expect } from '../../fixtures'
import { ArtistProfilePage } from '../../pages/artist-profile.page'
import { KNOWN_ARTISTS } from '../../fixtures/test-data'

/**
 * Consumer Journey: View Portfolio
 *
 * These tests cover the PortfolioSection + PortfolioLightbox flow.
 * We use Alex Chen's profile because the mock data guarantees portfolio items
 * for the featured artist.
 *
 * The lightbox is a client-side React component that mounts into the DOM after
 * a click on a portfolio grid item.  We wait for `role="dialog"` to become
 * visible before making assertions inside it.
 */
test.describe('Consumer Journey: View Portfolio', () => {
  test('can view a portfolio item in the lightbox', async ({ publicPage }) => {
    const profile = new ArtistProfilePage(publicPage)
    const { slug } = KNOWN_ARTISTS.alex

    await test.step('Given: the artist profile page is loaded', async () => {
      await profile.open(slug)
      await expect(profile.portfolioSection()).toBeVisible()
    })

    await test.step('And: the portfolio grid has at least one image', async () => {
      await expect(profile.portfolioImages().first()).toBeVisible()
    })

    await test.step('When: the user clicks the first portfolio image', async () => {
      await profile.openLightbox(0)
    })

    await test.step('Then: the lightbox dialog is visible', async () => {
      await expect(profile.lightboxDialog()).toBeVisible()
    })

    await test.step('And: the lightbox displays an image', async () => {
      await expect(profile.lightboxImage()).toBeVisible()
    })

    await test.step('And: the close button is present', async () => {
      await expect(profile.lightboxClose()).toBeVisible()
    })
  })

  test('can navigate through the portfolio lightbox and close it', async ({
    publicPage,
  }) => {
    const profile = new ArtistProfilePage(publicPage)
    const { slug } = KNOWN_ARTISTS.alex

    await test.step('Given: the lightbox is open on the first image', async () => {
      await profile.open(slug)
      await expect(profile.portfolioImages().first()).toBeVisible()
      // Confirm there are at least 2 items before attempting navigation
      const count = await profile.portfolioImages().count()
      test.skip(count < 2, 'Need at least 2 portfolio items to test navigation')
      await profile.openLightbox(0)
      await expect(profile.lightboxDialog()).toBeVisible()
    })

    await test.step('When: the user clicks the "下一張" next button', async () => {
      const initialSrc = await profile.lightboxImage().getAttribute('src')
      await profile.lightboxNext().click()

      await test.step('Then: the displayed image changes', async () => {
        // Wait for React state update to propagate — the src attribute changes
        await expect(profile.lightboxImage()).not.toHaveAttribute(
          'src',
          initialSrc ?? '',
        )
      })
    })

    await test.step('When: the user clicks the "關閉" close button', async () => {
      await profile.lightboxClose().click()
    })

    await test.step('Then: the lightbox dialog is no longer visible', async () => {
      await expect(profile.lightboxDialog()).not.toBeVisible()
    })

    await test.step('And: the portfolio grid is still visible', async () => {
      await expect(profile.portfolioSection()).toBeVisible()
    })
  })
})
