import { type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the InquiryForm BottomDrawer.
 *
 * The drawer is not a page in its own right — it is opened from an artist
 * profile page by clicking the "我想詢價" button.  Callers must first
 * navigate to an artist profile page and call `open()` (or click the inquiry
 * button themselves) before interacting with any locator here.
 *
 * DOM structure (abridged):
 *
 *   <div data-state="open">                    — BottomDrawerContent
 *     <header>
 *       <h2>"向 {artistName} 詢價"</h2>         — BottomDrawerTitle
 *       <p>"填寫你的刺青需求…"</p>              — BottomDrawerDescription
 *     </header>
 *     <form>
 *       <textarea id="inquiry-description">    — description field
 *       <button role="combobox">               — body part Select trigger
 *         <SelectContent>                      — portal-mounted option list
 *       <input id="inquiry-size">              — size estimate field
 *       <input type="number" placeholder="最低"> — budget min
 *       <input type="number" placeholder="最高"> — budget max
 *       <p class="text-ink-error">             — field-level error messages
 *       <button type="submit">                 — submit / LINE login button
 *     </form>
 *   </div>
 *
 * Auth-aware submit button:
 *   - Authenticated:    renders t('inquiry.submit') = "送出詢價"
 *   - Unauthenticated:  renders "LINE 登入後詢價" (hardcoded string)
 */
export class InquiryFormPage extends BasePage {
  // --- Drawer container ---

  /**
   * The BottomDrawer content panel.
   * Identified by the drawer title so we never reach outside the panel.
   */
  drawer(): Locator {
    return this.page.locator('[role="dialog"]').or(
      this.page.locator('[data-state="open"]').filter({
        has: this.page.getByRole('heading', {
          name: /詢價/,
        }),
      }),
    )
  }

  // --- Form field locators ---

  /** The multi-line textarea for the tattoo description */
  descriptionField(): Locator {
    return this.page.locator('#inquiry-description')
  }

  /**
   * The Select trigger button for the body part field.
   * Shadcn <SelectTrigger> renders as a <button role="combobox">.
   */
  bodyPartSelect(): Locator {
    return this.page.getByRole('combobox')
  }

  /** The text input for the size estimate */
  sizeField(): Locator {
    return this.page.locator('#inquiry-size')
  }

  /** The number input for the minimum budget */
  budgetMinField(): Locator {
    return this.page.getByRole('spinbutton').first()
  }

  /** The number input for the maximum budget */
  budgetMaxField(): Locator {
    return this.page.getByRole('spinbutton').nth(1)
  }

  /**
   * The form submit button.
   * - Authenticated user:    "送出詢價"
   * - Unauthenticated user:  "LINE 登入後詢價"
   */
  submitButton(): Locator {
    return this.page.getByRole('button', { name: /送出詢價|LINE 登入後詢價/ })
  }

  /**
   * All visible field-level validation error messages.
   * The form renders errors as <p class="text-sm text-ink-error">.
   */
  validationErrors(): Locator {
    return this.page.locator('p.text-ink-error, p.text-red-500')
  }

  // --- Actions ---

  /**
   * Open the inquiry drawer by clicking the "我想詢價" button on an artist
   * profile page.  Waits until the drawer's title is visible.
   */
  async open(): Promise<void> {
    await this.page
      .getByRole('button', { name: this.t('artistProfile.inquire') })
      .first()
      .click()
    await this.page
      .getByRole('heading', { name: /詢價/ })
      .waitFor({ state: 'visible' })
  }

  /** Type text into the description textarea */
  async fillDescription(text: string): Promise<void> {
    await this.descriptionField().fill(text)
  }

  /**
   * Select a body part option from the shadcn Select dropdown.
   * Clicks the trigger to open the dropdown, then clicks the matching option.
   *
   * @param part - The body part label as it appears in the option list,
   *               e.g. "手臂（上臂）"
   */
  async selectBodyPart(part: string): Promise<void> {
    await this.bodyPartSelect().click()
    await this.page.getByRole('option', { name: part }).click()
  }

  /** Fill the size estimate input */
  async fillSize(size: string): Promise<void> {
    await this.sizeField().fill(size)
  }

  /**
   * Fill the budget range inputs.
   *
   * @param min - Minimum budget as a string (e.g. "8000")
   * @param max - Maximum budget as a string (e.g. "15000")
   */
  async fillBudget(min: string, max: string): Promise<void> {
    await this.budgetMinField().fill(min)
    await this.budgetMaxField().fill(max)
  }

  /** Click the submit button */
  async submit(): Promise<void> {
    await this.submitButton().click()
  }

  /**
   * Fill every required field and submit the form in one call.
   *
   * @param data.description  - Tattoo description (min 10 chars)
   * @param data.bodyPart     - Body part option label
   * @param data.size         - Size estimate string
   * @param data.budgetMin    - Optional minimum budget
   * @param data.budgetMax    - Optional maximum budget
   */
  async fillAndSubmit(data: {
    description: string
    bodyPart: string
    size: string
    budgetMin?: string
    budgetMax?: string
  }): Promise<void> {
    await this.fillDescription(data.description)
    await this.selectBodyPart(data.bodyPart)
    await this.fillSize(data.size)
    if (data.budgetMin !== undefined && data.budgetMax !== undefined) {
      await this.fillBudget(data.budgetMin, data.budgetMax)
    }
    await this.submit()
  }
}
