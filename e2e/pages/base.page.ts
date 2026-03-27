import { type Page, type Locator } from '@playwright/test'
import { createTranslator, type Translator } from '../helpers/i18n.helper'

const DEFAULT_LOCALE = 'zh-TW'
const MOBILE_BREAKPOINT = 1024

export class BasePage {
  readonly page: Page
  readonly t: Translator
  readonly locale: string

  constructor(page: Page, locale: string = DEFAULT_LOCALE) {
    this.page = page
    this.locale = locale
    this.t = createTranslator(locale as 'zh-TW' | 'en')
  }

  /** Navigate to a locale-prefixed path */
  async goto(path: string) {
    const url = `/${this.locale}${path.startsWith('/') ? path : `/${path}`}`
    await this.page.goto(url)
    await this.waitForHydration()
  }

  /** Wait for Next.js hydration to complete */
  async waitForHydration() {
    await this.page.waitForLoadState('domcontentloaded')
    // Wait for Next.js route announcer (signals hydration complete)
    await this.page.waitForSelector('next-route-announcer', {
      state: 'attached',
      timeout: 10_000,
    }).catch(() => {
      // Fallback: just wait for network idle
    })
    await this.page.waitForLoadState('networkidle').catch(() => {
      // Some pages have persistent connections (Realtime)
    })
  }

  /** Check if running in mobile viewport */
  isMobile(): boolean {
    const viewport = this.page.viewportSize()
    return (viewport?.width ?? 0) < MOBILE_BREAKPOINT
  }

  /** Get a locator by translated text */
  getByText(key: string, params?: Record<string, string | number>): Locator {
    return this.page.getByText(this.t(key, params))
  }

  /** Get a link by translated text */
  getLink(key: string, params?: Record<string, string | number>): Locator {
    return this.page.getByRole('link', { name: this.t(key, params) })
  }

  /** Get a button by translated text */
  getButton(key: string, params?: Record<string, string | number>): Locator {
    return this.page.getByRole('button', { name: this.t(key, params) })
  }

  /** Get a heading by translated text */
  getHeading(
    key: string,
    params?: Record<string, string | number>,
  ): Locator {
    return this.page.getByRole('heading', { name: this.t(key, params) })
  }
}
