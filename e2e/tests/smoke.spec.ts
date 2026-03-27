import { test, expect } from '../fixtures'

test.describe('Smoke tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/InkHunt/)
  })
})
