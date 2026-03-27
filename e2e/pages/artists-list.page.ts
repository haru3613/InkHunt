import { type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the artists list page (/artists).
 *
 * The page renders:
 *   - An H1 with the translated "找刺青師" heading
 *   - A paragraph showing the total count via the "artists.total" key
 *   - <ArtistFilters> — a city <Select> + a row of style <button> elements
 *   - A grid of <ArtistCard> components, each wrapped in an <a> link
 *
 * Style filter buttons are plain <button type="button"> elements containing
 * a <StyleBadge>.  They do not carry a name attribute, but their visible text
 * (the style name) is sufficient for getByRole('button', { name }).
 *
 * The city filter is a shadcn/ui <Select> whose trigger renders as a <button>
 * with the current selection as its accessible text.
 */
export class ArtistsListPage extends BasePage {
  // --- Locators ---

  /** H1 "找刺青師" */
  title(): Locator {
    return this.getHeading('artists.title')
  }

  /**
   * The total-count paragraph, e.g. "共 10 位刺青師".
   * We match by partial text so the test is count-agnostic.
   */
  totalCount(): Locator {
    return this.page.locator('p').filter({
      hasText: /共 \d+ 位刺青師/,
    })
  }

  /**
   * All artist card links.
   * Each ArtistCard renders as an <a> wrapping a <Card>; the link's
   * accessible name comes from the artist's display name inside the card.
   */
  artistCards(): Locator {
    return this.page.getByRole('link').filter({
      has: this.page.locator('h3'),
    })
  }

  /**
   * The city filter trigger button (shadcn Select).
   * The trigger shows the current selection ("全部地區" by default).
   */
  cityFilter(): Locator {
    return this.page.getByRole('combobox')
  }

  /**
   * A style filter button by its visible label.
   *
   * @param styleName - The style name as it appears in the UI, e.g. "暗黑"
   */
  styleFilterButton(styleName: string): Locator {
    return this.page.getByRole('button', { name: styleName })
  }

  // --- Actions ---

  /** Navigate to the artists list page */
  async open(): Promise<void> {
    await this.goto('/artists')
  }

  /**
   * Click a style filter badge and wait for the URL to update with the
   * ?style= query parameter, then wait for the page to settle.
   *
   * @param styleName - Visible style label, e.g. "暗黑"
   */
  async filterByStyle(styleName: string): Promise<void> {
    await this.styleFilterButton(styleName).click()
    await this.page.waitForURL(/[?&]style=/)
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Click an artist card that contains the given display name.
   * Navigates to the artist's profile page.
   *
   * @param displayName - The artist's display name as rendered in the card
   */
  async clickArtist(displayName: string): Promise<void> {
    await this.page
      .getByRole('link')
      .filter({ hasText: displayName })
      .first()
      .click()
    await this.page.waitForLoadState('domcontentloaded')
  }
}
