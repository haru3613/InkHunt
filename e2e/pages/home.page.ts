import { type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the homepage (/).
 *
 * The hero is server-rendered with two heading lines — heroTitleLine1 is the
 * visually-hidden first line and heroTitleLine2 ("刺青師") is the coloured
 * accent line rendered as a <span> inside the same <h1>.  Both live in the
 * same heading so we target the <h1> element directly rather than individual
 * text nodes.
 */
export class HomePage extends BasePage {
  // --- Locators ---

  /** The H1 that contains both hero title lines */
  heroTitle(): Locator {
    return this.page.getByRole('heading', { level: 1 })
  }

  /** The "開始找刺青師" CTA link */
  startSearchLink(): Locator {
    return this.getLink('home.startSearch')
  }

  /** The "我是刺青師" secondary link */
  iAmArtistLink(): Locator {
    return this.getLink('home.iAmArtist')
  }

  /**
   * The recommended-artists <section>.
   * Identified by the H2 heading text because the section itself has no
   * landmark role — we use the surrounding context.
   */
  featuredSection(): Locator {
    return this.page.locator('section').filter({
      has: this.getHeading('home.recommended'),
    })
  }

  /**
   * The browse-by-style <section>.
   * Identified by its H2 heading text.
   */
  styleGridSection(): Locator {
    return this.page.locator('section').filter({
      has: this.getHeading('home.browseByStyle'),
    })
  }

  // --- Actions ---

  /** Navigate to the homepage */
  async open(): Promise<void> {
    await this.goto('/')
  }

  /**
   * Click the primary CTA ("開始找刺青師") and wait for the artists list page
   * to reach the domcontentloaded state.
   */
  async navigateToArtists(): Promise<void> {
    await this.startSearchLink().click()
    await this.page.waitForLoadState('domcontentloaded')
  }
}
