import { test, expect } from '../../fixtures'
import { ArtistDashboardPage } from '../../pages/artist-dashboard.page'
import { ArtistProfileFormPage } from '../../pages/artist-profile-form.page'

test.describe('Artist Journey: Manage Profile', () => {
  test('can access profile editor from dashboard', async ({ artistPage }) => {
    const dashboard = new ArtistDashboardPage(artistPage)
    const profileForm = new ArtistProfileFormPage(artistPage)

    await test.step('Given: an active artist is on the dashboard', async () => {
      await dashboard.goto()
      await expect(dashboard.dashboardTitle()).toBeVisible()
    })

    await test.step('When: they click the "個人檔案" nav link', async () => {
      await dashboard.navigateTo('個人檔案')
    })

    await test.step('Then: the profile form page loads', async () => {
      await expect(artistPage).toHaveURL(/\/artist\/profile/)
    })

    await test.step('And: the page heading is visible', async () => {
      await expect(profileForm.pageHeading()).toBeVisible()
    })

    await test.step('And: the 顯示名稱 field is present', async () => {
      await expect(profileForm.displayNameField()).toBeVisible()
    })
  })

  test('can fill and save profile form', async ({ artistPage }) => {
    const profileForm = new ArtistProfileFormPage(artistPage)

    await test.step('Given: an active artist navigates directly to /artist/profile', async () => {
      await profileForm.goto()
      await expect(profileForm.pageHeading()).toBeVisible()
    })

    await test.step('When: they fill in the display name', async () => {
      await profileForm.fillDisplayName('Alex Chen 阿克')
    })

    await test.step('And: they fill in a bio', async () => {
      await profileForm.fillBio('專注於寫實與肖像風格，10 年經驗')
    })

    await test.step('And: they fill in the city', async () => {
      await profileForm.fillCity('台北市')
    })

    await test.step('And: they set a price range', async () => {
      await profileForm.fillPriceRange(5000, 30000)
    })

    await test.step('And: they fill in the Instagram handle', async () => {
      await profileForm.fillIgHandle('@alextattoo')
    })

    await test.step('And: they click the save button', async () => {
      await profileForm.save()
    })

    await test.step('Then: a success message is shown', async () => {
      await expect(profileForm.successMessage()).toBeVisible()
    })
  })
})
