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

  /** h1 shown when the visitor is not logged in: "刺青師後台" */
  pageTitle(): Locator {
    return this.page.getByRole('heading', { name: '刺青師後台', level: 1 })
  }

  /** LINE login button shown to unauthenticated visitors */
  loginButton(): Locator {
    return this.page.getByRole('button', { name: 'LINE 登入' })
  }

  /** h1 shown to a logged-in user who has no artist profile yet: "成為 InkHunt 刺青師" */
  newUserTitle(): Locator {
    return this.page.getByRole('heading', { name: '成為 InkHunt 刺青師', level: 1 })
  }

  /** "開始申請" CTA shown to logged-in users with no artist profile */
  startApplicationButton(): Locator {
    return this.page.getByRole('button', { name: '開始申請' })
  }

  /** h1 shown when the artist application is pending review: "申請審核中" */
  reviewStatusHeading(): Locator {
    return this.page.getByRole('heading', { name: '申請審核中', level: 1 })
  }
}
