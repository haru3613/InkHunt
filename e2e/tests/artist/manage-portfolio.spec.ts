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

    await test.step('And: the grid or empty-state is rendered', async () => {
      // When there are no items, the grid is replaced by the empty-state message
      const gridVisible = await portfolio.portfolioGrid().isVisible().catch(() => false)
      const emptyVisible = await portfolio.emptyState().isVisible().catch(() => false)

      expect(
        gridVisible || emptyVisible,
        'Either the portfolio grid or the empty-state message must be visible',
      ).toBe(true)
    })
  })
})
