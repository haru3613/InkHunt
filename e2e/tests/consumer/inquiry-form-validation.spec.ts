/**
 * Consumer: inquiry form field-level validation.
 *
 * Covers the cases where a user submits the InquiryForm BottomDrawer with
 * one or more required fields left empty.  Complements the broad
 * "shows validation errors on empty submit" scenario in submit-inquiry.spec.ts
 * with more granular, per-field assertions.
 *
 * All tests use the `consumerPage` fixture (authenticated consumer) so the
 * submit button renders "送出詢價" and clicking it actually attempts
 * submission rather than triggering the LINE login redirect.
 */

import { test, expect } from '../../fixtures'
import { ArtistProfilePage } from '../../pages/artist-profile.page'
import { InquiryFormPage } from '../../pages/inquiry-form.page'
import { KNOWN_ARTISTS } from '../../fixtures/test-data'

// ---------------------------------------------------------------------------
// Shared setup helper
// ---------------------------------------------------------------------------

/**
 * Open the artist profile and the inquiry drawer in a single step.
 * Returns both page objects ready to use.
 */
async function openInquiryDrawer(page: import('@playwright/test').Page) {
  const profilePage = new ArtistProfilePage(page)
  const formPage = new InquiryFormPage(page)
  await profilePage.open(KNOWN_ARTISTS.alex.slug)
  await formPage.open()
  return { profilePage, formPage }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Consumer: inquiry form — field-level validation', () => {
  // -------------------------------------------------------------------------
  // 1. Empty description
  // -------------------------------------------------------------------------

  test('submitting with empty description shows description validation error', async ({
    consumerPage,
  }) => {
    const { formPage } = await openInquiryDrawer(consumerPage)

    // ------------------------------------------------------------------
    // Given: all fields are filled except description
    // ------------------------------------------------------------------
    await test.step('Given: the inquiry drawer is open', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })

    await test.step('And: all required fields are filled except description', async () => {
      // Intentionally skip fillDescription — leave it empty.
      await formPage.selectBodyPart('手臂（上臂）')
      await formPage.fillSize('15x10 cm')
    })

    // ------------------------------------------------------------------
    // When: the consumer submits the form
    // ------------------------------------------------------------------
    await test.step('When: the consumer clicks submit', async () => {
      await formPage.submit()
    })

    // ------------------------------------------------------------------
    // Then: a validation error is shown
    // ------------------------------------------------------------------
    await test.step('Then: at least one validation error is visible', async () => {
      await expect(formPage.validationErrors().first()).toBeVisible()
    })

    await test.step('And: the description field is marked invalid', async () => {
      await expect(formPage.descriptionField()).toHaveAttribute('aria-invalid', 'true')
    })

    // ------------------------------------------------------------------
    // And: the form has NOT navigated away (submission was blocked)
    // ------------------------------------------------------------------
    await test.step('And: the inquiry drawer is still open (form not submitted)', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })

    await test.step('And: the URL has not changed to an inquiry chat page', async () => {
      expect(consumerPage.url()).not.toMatch(/\/inquiries\//)
    })
  })

  // -------------------------------------------------------------------------
  // 2. Description too short (under minimum length)
  // -------------------------------------------------------------------------

  test('submitting with a very short description shows length validation error', async ({
    consumerPage,
  }) => {
    const { formPage } = await openInquiryDrawer(consumerPage)

    await test.step('Given: the inquiry drawer is open', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })

    await test.step('And: description is filled with fewer than 10 characters', async () => {
      await formPage.fillDescription('短')
      await formPage.selectBodyPart('手臂（上臂）')
      await formPage.fillSize('15x10 cm')
    })

    await test.step('When: the consumer clicks submit', async () => {
      await formPage.submit()
    })

    await test.step('Then: a validation error appears on the description field', async () => {
      await expect(formPage.validationErrors().first()).toBeVisible()
      await expect(formPage.descriptionField()).toHaveAttribute('aria-invalid', 'true')
    })

    await test.step('And: the form stays open', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // 3. Empty body part
  // -------------------------------------------------------------------------

  test('submitting without selecting a body part shows body part validation error', async ({
    consumerPage,
  }) => {
    const { formPage } = await openInquiryDrawer(consumerPage)

    // ------------------------------------------------------------------
    // Given: all required fields are filled except body part
    // ------------------------------------------------------------------
    await test.step('Given: the inquiry drawer is open', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })

    await test.step('And: description and size are filled but body part is not selected', async () => {
      await formPage.fillDescription('想刺一個寫實風格的狼頭，參考了很多作品，希望有層次感')
      await formPage.fillSize('15x10 cm')
      // Intentionally skip selectBodyPart.
    })

    // ------------------------------------------------------------------
    // When: the consumer submits the form
    // ------------------------------------------------------------------
    await test.step('When: the consumer clicks submit', async () => {
      await formPage.submit()
    })

    // ------------------------------------------------------------------
    // Then: the body part combobox is marked invalid
    // ------------------------------------------------------------------
    await test.step('Then: at least one validation error is visible', async () => {
      await expect(formPage.validationErrors().first()).toBeVisible()
    })

    await test.step('And: the body part select trigger is marked invalid', async () => {
      await expect(formPage.bodyPartSelect()).toHaveAttribute('aria-invalid', 'true')
    })

    await test.step('And: the drawer remains open', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })
  })

  // -------------------------------------------------------------------------
  // 4. Both description and body part empty (multiple errors at once)
  // -------------------------------------------------------------------------

  test('submitting with both description and body part empty shows multiple errors', async ({
    consumerPage,
  }) => {
    const { formPage } = await openInquiryDrawer(consumerPage)

    await test.step('Given: the inquiry drawer is open', async () => {
      await expect(formPage.drawer()).toBeVisible()
    })

    await test.step('And: only size is filled — description and body part are empty', async () => {
      // Only fill size to satisfy one field; the other two required fields
      // (description, body part) are intentionally left empty.
      await formPage.fillSize('15x10 cm')
    })

    await test.step('When: the consumer clicks submit', async () => {
      await formPage.submit()
    })

    await test.step('Then: more than one validation error is shown', async () => {
      const errors = formPage.validationErrors()
      await expect(errors.first()).toBeVisible()
      // There should be at least 2 errors (one per invalid field).
      const count = await errors.count()
      expect(count, 'Expected at least 2 validation errors').toBeGreaterThanOrEqual(2)
    })

    await test.step('And: description field is marked invalid', async () => {
      await expect(formPage.descriptionField()).toHaveAttribute('aria-invalid', 'true')
    })

    await test.step('And: body part select is marked invalid', async () => {
      await expect(formPage.bodyPartSelect()).toHaveAttribute('aria-invalid', 'true')
    })

    await test.step('And: the form has not submitted', async () => {
      await expect(formPage.drawer()).toBeVisible()
      expect(consumerPage.url()).not.toMatch(/\/inquiries\//)
    })
  })

  // -------------------------------------------------------------------------
  // 5. Filling in the previously-invalid field clears its error
  // -------------------------------------------------------------------------

  test('fixing the description field removes its validation error', async ({ consumerPage }) => {
    const { formPage } = await openInquiryDrawer(consumerPage)

    // ------------------------------------------------------------------
    // Given: form is submitted blank to trigger errors
    // ------------------------------------------------------------------
    await test.step('Given: the form has been submitted empty to reveal errors', async () => {
      await formPage.submit()
      await expect(formPage.descriptionField()).toHaveAttribute('aria-invalid', 'true')
    })

    // ------------------------------------------------------------------
    // When: the consumer fills in the description field
    // ------------------------------------------------------------------
    await test.step('When: the consumer fills in a valid description', async () => {
      await formPage.fillDescription('想刺一個寫實風格的狼頭，參考了很多作品，希望有層次感')
    })

    // ------------------------------------------------------------------
    // Then: the description field error is cleared
    // ------------------------------------------------------------------
    await test.step('Then: the description field is no longer marked invalid', async () => {
      // Trigger re-validation by blurring the field (onChange or onBlur mode).
      await formPage.descriptionField().blur()
      await expect(formPage.descriptionField()).not.toHaveAttribute('aria-invalid', 'true')
    })
  })

  // -------------------------------------------------------------------------
  // 6. Correctly filled form does NOT show validation errors
  // -------------------------------------------------------------------------

  test('fully filled form shows no validation errors on submit', async ({ consumerPage }) => {
    const { formPage } = await openInquiryDrawer(consumerPage)

    await test.step('Given: all required fields are filled with valid data', async () => {
      await formPage.fillDescription('想刺一個寫實風格的狼頭，參考了很多作品，希望有層次感')
      await formPage.selectBodyPart('手臂（上臂）')
      await formPage.fillSize('15x10 cm')
    })

    await test.step('When: the consumer clicks submit', async () => {
      await formPage.submit()
    })

    await test.step('Then: no validation errors are visible', async () => {
      // Give the error elements a moment to appear if they will.
      const errors = formPage.validationErrors()
      const count = await errors.count()
      expect(count, 'Validation errors appeared for a correctly filled form').toBe(0)
    })

    await test.step('And: the form navigates to the new inquiry chat page', async () => {
      // The mock API returns id "inquiry-new" for POST /api/inquiries.
      await consumerPage.waitForURL(/\/inquiries\/inquiry-new$/, { timeout: 10_000 })
    })
  })
})
