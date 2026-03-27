import { test, expect } from '../../fixtures'
import { HomePage } from '../../pages/home.page'
import { ArtistsListPage } from '../../pages/artists-list.page'
import { ArtistProfilePage } from '../../pages/artist-profile.page'
import { KNOWN_ARTISTS } from '../../fixtures/test-data'

test.describe('Consumer Journey: Browse & Discover', () => {
  test('can navigate from homepage to artist list', async ({ publicPage }) => {
    const home = new HomePage(publicPage)
    const list = new ArtistsListPage(publicPage)

    await test.step('Given: the homepage is loaded', async () => {
      await home.open()
      await expect(home.heroTitle()).toBeVisible()
    })

    await test.step('When: the user clicks "開始找刺青師"', async () => {
      await home.navigateToArtists()
    })

    await test.step('Then: the artist list page is shown', async () => {
      await expect(list.title()).toBeVisible()
    })

    await test.step('And: the page displays a non-zero artist count', async () => {
      await expect(list.totalCount()).toBeVisible()
    })

    await test.step('And: at least one artist card is rendered', async () => {
      await expect(list.artistCards().first()).toBeVisible()
    })
  })

  test('can filter artists by style', async ({ publicPage }) => {
    const list = new ArtistsListPage(publicPage)
    // Use a style we know exists in the mock data
    const targetStyle = KNOWN_ARTISTS.alex.styles[0] // '寫實'

    await test.step('Given: the artist list page is loaded', async () => {
      await list.open()
      await expect(list.title()).toBeVisible()
    })

    await test.step(`When: the user clicks the "${targetStyle}" style filter`, async () => {
      await list.filterByStyle(targetStyle)
    })

    await test.step('Then: the URL contains the style query parameter', async () => {
      await expect(publicPage).toHaveURL(/[?&]style=/)
    })

    await test.step('And: filtered artist cards are displayed', async () => {
      await expect(list.artistCards().first()).toBeVisible()
    })

    await test.step('And: the filtered list includes the known artist for that style', async () => {
      await expect(
        publicPage.getByText(KNOWN_ARTISTS.alex.displayName),
      ).toBeVisible()
    })
  })

  test('can browse an artist profile from the list', async ({ publicPage }) => {
    const list = new ArtistsListPage(publicPage)
    const profile = new ArtistProfilePage(publicPage)
    const artist = KNOWN_ARTISTS.alex

    await test.step('Given: the artist list page is loaded', async () => {
      await list.open()
      await expect(list.artistCards().first()).toBeVisible()
    })

    await test.step(`When: the user clicks the card for "${artist.displayName}"`, async () => {
      await list.clickArtist(artist.displayName)
    })

    await test.step('Then: the artist profile page is shown with the correct name', async () => {
      await expect(profile.displayName()).toHaveText(artist.displayName)
    })

    await test.step('And: the profile URL contains the artist slug', async () => {
      await expect(publicPage).toHaveURL(new RegExp(artist.slug))
    })

    await test.step('And: the profile shows at least one style badge', async () => {
      await expect(
        publicPage.getByText(artist.styles[0]),
      ).toBeVisible()
    })

    await test.step('And: the portfolio section heading is visible', async () => {
      await expect(profile.portfolioSection()).toBeVisible()
    })
  })
})
