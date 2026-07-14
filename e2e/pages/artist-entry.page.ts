import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * POM for /artist entry page.
 *
 * This page uses hardcoded Chinese strings — not i18n — so all selectors
 * target literal text rather than translation keys.
 */
export class ArtistEntryPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/artist')
  }

  /**
   * h1 shown when the visitor is not logged in (LandingScreen in
   * src/app/[locale]/(artist)/artist/page.tsx): "在 InkHunt 展示你的作品"
   */
  pageTitle(): Locator {
    return this.page.getByRole('heading', { name: '在 InkHunt 展示你的作品', level: 1 })
  }

  /** LINE login button shown to unauthenticated visitors */
  loginButton(): Locator {
    return this.page.getByRole('button', { name: 'LINE 登入開始建立' })
  }

  /** h1 shown when the artist application is pending review: "申請審核中" */
  reviewStatusHeading(): Locator {
    return this.page.getByRole('heading', { name: '申請審核中', level: 1 })
  }
}
