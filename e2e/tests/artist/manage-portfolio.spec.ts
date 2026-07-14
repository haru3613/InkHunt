import { test, expect } from '../../fixtures'
import { ArtistDashboardPage } from '../../pages/artist-dashboard.page'
import { ArtistPortfolioPage } from '../../pages/artist-portfolio.page'

test.describe('Artist Journey: Manage Portfolio', () => {
  test('can access portfolio manager from dashboard', async ({ artistPage }) => {
    const dashboard = new ArtistDashboardPage(artistPage)
    const portfolio = new ArtistPortfolioPage(artistPage)

    await test.step('Given: an active artist is on the dashboard', async () => {
      await dashboard.goto()
      await expect(dashboard.dashboardTitle()).toBeVisible()
    })

    await test.step('When: they click the "作品集" nav link', async () => {
      await dashboard.navigateTo('作品集')
    })

    await test.step('Then: the portfolio management page loads', async () => {
      await expect(artistPage).toHaveURL(/\/artist\/portfolio/)
    })

    await test.step('And: the "作品集管理" heading is visible', async () => {
      await expect(portfolio.pageHeading()).toBeVisible()
    })
  })

  test('shows portfolio upload interface', async ({ artistPage }) => {
    const portfolio = new ArtistPortfolioPage(artistPage)

    await test.step('Given: an active artist navigates directly to /artist/portfolio', async () => {
      await portfolio.goto()
      await expect(portfolio.pageHeading()).toBeVisible()
    })

    await test.step('Then: the upload button is visible', async () => {
      await expect(portfolio.uploadButton()).toBeVisible()
    })

    await test.step('And: an item count label is present', async () => {
      await expect(portfolio.itemCountLabel()).toBeVisible()
    })

    await test.step('And: the grid renders the mocked portfolio item', async () => {
      // HAR-665: GET /api/artists/*/portfolio is now mocked with one fixture
      // item (see e2e/fixtures/api-mocks.fixture.ts), so the grid — not the
      // empty-state — is the deterministic outcome here.
      await expect(portfolio.portfolioGrid()).toBeVisible()
      await expect(portfolio.portfolioItems()).toHaveCount(1)
      await expect(portfolio.emptyState()).toBeHidden()
    })
  })
})
