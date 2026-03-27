import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * POM for /artist/profile — the ProfileForm component.
 *
 * All labels are hardcoded Chinese strings in ProfileForm.tsx.
 * Fields are located by their visible label text rather than by
 * placeholder or id so tests remain robust to markup changes.
 */
export class ArtistProfileFormPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/artist/profile')
  }

  // ---------------------------------------------------------------------------
  // Page-level heading
  // ---------------------------------------------------------------------------

  /**
   * Returns the h1 for the profile page.
   * Text is "編輯個人檔案" when an artist profile exists, or
   * "申請成為刺青師" when creating a new profile.
   */
  pageHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 })
  }

  // ---------------------------------------------------------------------------
  // Form field locators
  // ---------------------------------------------------------------------------

  /** 顯示名稱 — required text input */
  displayNameField(): Locator {
    return this.page.getByLabel('顯示名稱')
  }

  /** 自我介紹 — textarea */
  bioField(): Locator {
    return this.page.getByLabel('自我介紹')
  }

  /**
   * 城市 — text input (ProfileForm uses a plain Input, not a Select).
   * The label text includes a required asterisk span so we use exact: false.
   */
  cityField(): Locator {
    return this.page.getByLabel('城市', { exact: false })
  }

  /** 區域 — text input */
  districtField(): Locator {
    return this.page.getByLabel('區域')
  }

  /** 價格範圍 minimum — number input (placeholder "最低") */
  priceMinField(): Locator {
    return this.page.getByPlaceholder('最低')
  }

  /** 價格範圍 maximum — number input (placeholder "最高") */
  priceMaxField(): Locator {
    return this.page.getByPlaceholder('最高')
  }

  /** Instagram — text input */
  igHandleField(): Locator {
    return this.page.getByLabel('Instagram')
  }

  /**
   * All style toggle buttons in the 擅長風格 section.
   * Each button renders a style name as its text content.
   */
  styleToggles(): Locator {
    return this.page.locator('button[type="button"]').filter({
      hasText: /.+/,
    })
  }

  /**
   * A single style toggle button by exact style name.
   * @param styleName — e.g. '極簡線條', '幾何', '寫實'
   */
  styleToggle(styleName: string): Locator {
    return this.page.getByRole('button', { name: styleName, exact: true })
  }

  /** Save / submit button — text is "儲存" when editing, "提交申請" when creating */
  saveButton(): Locator {
    return this.page.getByRole('button', { name: /^(儲存|提交申請)$/ })
  }

  /** Success message shown after a successful save */
  successMessage(): Locator {
    return this.page.getByText(/已儲存|申請已送出/)
  }

  // ---------------------------------------------------------------------------
  // Compound actions
  // ---------------------------------------------------------------------------

  async fillDisplayName(name: string) {
    await this.displayNameField().fill(name)
  }

  async fillBio(bio: string) {
    await this.bioField().fill(bio)
  }

  async fillCity(city: string) {
    await this.cityField().fill(city)
  }

  async fillPriceRange(min: number, max: number) {
    await this.priceMinField().fill(String(min))
    await this.priceMaxField().fill(String(max))
  }

  async fillIgHandle(handle: string) {
    await this.igHandleField().fill(handle)
  }

  /** Click a style toggle button to select or deselect it */
  async toggleStyle(styleName: string) {
    await this.styleToggle(styleName).click()
  }

  /** Click the save / submit button and wait for network to settle */
  async save() {
    await this.saveButton().click()
    await this.page.waitForLoadState('networkidle').catch(() => {})
  }
}
