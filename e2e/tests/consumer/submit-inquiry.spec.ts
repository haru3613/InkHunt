import { test, expect } from '../../fixtures'
import { ArtistProfilePage } from '../../pages/artist-profile.page'
import { InquiryFormPage } from '../../pages/inquiry-form.page'
import { KNOWN_ARTISTS } from '../../fixtures/test-data'

/**
 * Consumer journey: Submit an inquiry from an artist's profile page.
 *
 * All tests navigate to the artist profile page first, then open the inquiry
 * drawer by clicking the "我想詢價" button.  The form is rendered inside a
 * BottomDrawer and is not a separate page.
 */
test.describe('Consumer: submit inquiry', () => {
  test('shows validation errors on empty submit', async ({ consumerPage }) => {
    const profilePage = new ArtistProfilePage(consumerPage)
    const formPage = new InquiryFormPage(consumerPage)

    await test.step('Given: the consumer is on an artist profile page', async () => {
      await profilePage.open(KNOWN_ARTISTS.alex.slug)
    })

    await test.step('When: the consumer opens the inquiry drawer', async () => {
      await formPage.open()
    })

    await test.step('And: the consumer submits the form without filling any fields', async () => {
      await formPage.submit()
    })

    await test.step('Then: validation errors are displayed', async () => {
      const errors = formPage.validationErrors()
      await expect(errors.first()).toBeVisible()
    })

    await test.step('And: the description field is marked invalid', async () => {
      await expect(formPage.descriptionField()).toHaveAttribute('aria-invalid', 'true')
    })

    await test.step('And: the body part select is marked invalid', async () => {
      await expect(formPage.bodyPartSelect()).toHaveAttribute('aria-invalid', 'true')
    })

    await test.step('And: the size field is marked invalid', async () => {
      await expect(formPage.sizeField()).toHaveAttribute('aria-invalid', 'true')
    })
  })

  test('can fill and submit inquiry form', async ({ consumerPage }) => {
    const profilePage = new ArtistProfilePage(consumerPage)
    const formPage = new InquiryFormPage(consumerPage)

    await test.step('Given: the consumer is on an artist profile page', async () => {
      await profilePage.open(KNOWN_ARTISTS.alex.slug)
    })

    await test.step('And: the inquiry drawer is open', async () => {
      await formPage.open()
    })

    await test.step('When: the consumer fills all required fields', async () => {
      await formPage.fillAndSubmit({
        description: '想刺一個寫實風格的狼頭，參考了很多作品，希望有層次感',
        bodyPart: '手臂（上臂）',
        size: '15x10 cm',
        budgetMin: '8000',
        budgetMax: '15000',
      })
    })

    await test.step('Then: the form is submitted successfully (no validation errors)', async () => {
      const errors = formPage.validationErrors()
      await expect(errors).toHaveCount(0)
    })

    await test.step('And: the browser navigates to the new inquiry chat page', async () => {
      await consumerPage.waitForURL(/\/inquiries\/inquiry-new$/)
    })
  })

  test('shows login prompt when not authenticated', async ({ publicPage }) => {
    const profilePage = new ArtistProfilePage(publicPage)
    const formPage = new InquiryFormPage(publicPage)

    await test.step('Given: an unauthenticated visitor is on an artist profile page', async () => {
      await profilePage.open(KNOWN_ARTISTS.alex.slug)
    })

    await test.step('When: the visitor opens the inquiry drawer', async () => {
      await formPage.open()
    })

    await test.step('Then: the submit button shows the LINE login prompt instead of the submit label', async () => {
      const submitBtn = formPage.submitButton()
      await expect(submitBtn).toBeVisible()
      await expect(submitBtn).toContainText('LINE 登入後詢價')
    })

    await test.step('And: the submit button does not show the authenticated label', async () => {
      const submitBtn = formPage.submitButton()
      await expect(submitBtn).not.toContainText('送出詢價')
    })
  })
})
