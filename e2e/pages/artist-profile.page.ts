import { type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for an artist profile page (/artists/[slug]).
 *
 * DOM structure (abridged):
 *
 *   <section>                         — ArtistProfile card
 *     <h1>{display_name}</h1>
 *     <p>{bio}</p>
 *     <div> style <Badge> elements    — one per style
 *     <div> price text               — formatted by formatPriceRange()
 *     <button> "我想詢價"             — InquiryButton (desktop, inside section)
 *   </section>
 *
 *   <h2>作品集</h2>                   — PortfolioSection heading
 *   <div> grid of <button> elements  — PortfolioGrid items, each wraps an <img>
 *
 *   <div role="dialog" aria-modal>   — PortfolioLightbox (conditionally mounted)
 *     <button aria-label="關閉">      — close button (top-right)
 *     <button aria-label="上一張">    — prev (when hasPrev)
 *     <button aria-label="下一張">    — next (when hasNext)
 *     <img>                          — current image
 *     <button> healed toggle         — only when item has healed_image_url
 *
 * The "我想詢價" button also appears in a <MobileCTA> sticky bar at the
 * bottom of the page on mobile.  We target the first occurrence.
 */
export class ArtistProfilePage extends BasePage {
  // --- Profile section locators ---

  /** H1 with the artist's display name */
  displayName(): Locator {
    return this.page.getByRole('heading', { level: 1 })
  }

  /**
   * Bio paragraph.
   * The bio is conditionally rendered; callers should check .isVisible()
   * before asserting content.
   */
  bio(): Locator {
    return this.page.locator('section p').first()
  }

  /**
   * All style badge elements inside the profile card.
   * Rendered as shadcn <Badge variant="secondary"> which maps to a <div>
   * with role="none" — we target them by their container.
   */
  styleBadges(): Locator {
    return this.page.locator('section .flex.flex-wrap').getByRole('generic')
  }

  /**
   * The price range text element.
   * formatPriceRange() returns strings like "NT$3,000 – NT$20,000" or
   * "NT$3,000 起" — we match by the NT$ prefix.
   */
  priceRange(): Locator {
    return this.page.locator('section').getByText(/NT\$/)
  }

  // --- Portfolio section locators ---

  /** H2 "作品集" heading */
  portfolioSection(): Locator {
    return this.getHeading('artistProfile.portfolio')
  }

  /**
   * All portfolio grid item buttons.
   * Each item is a <button type="button"> containing a Next.js <Image>.
   */
  portfolioImages(): Locator {
    return this.page.locator('div.grid button[type="button"]')
  }

  /**
   * The "我想詢價" inquiry button.
   * Matches the first occurrence (desktop inline or mobile sticky CTA).
   */
  inquireButton(): Locator {
    return this.getButton('artistProfile.inquire').first()
  }

  // --- Lightbox locators ---

  /**
   * The lightbox dialog element.
   * PortfolioLightbox renders as `<div role="dialog" aria-modal="true">`.
   */
  lightboxDialog(): Locator {
    return this.page.getByRole('dialog')
  }

  /**
   * The currently displayed image inside the lightbox.
   * Next.js <Image fill> renders an <img> inside a relative-positioned div.
   */
  lightboxImage(): Locator {
    return this.page.getByRole('dialog').locator('img')
  }

  /** The "下一張" next button inside the lightbox */
  lightboxNext(): Locator {
    return this.page.getByRole('button', { name: this.t('portfolio.next') })
  }

  /** The "上一張" prev button inside the lightbox */
  lightboxPrev(): Locator {
    return this.page.getByRole('button', { name: this.t('portfolio.prev') })
  }

  /**
   * The close button inside the lightbox.
   * There are two elements with aria-label="關閉": the overlay backdrop and
   * the visible X button.  We target the <button> element explicitly.
   */
  lightboxClose(): Locator {
    return this.page
      .getByRole('dialog')
      .getByRole('button', { name: this.t('portfolio.close') })
  }

  /**
   * The healed/original toggle button.
   * Only present when the current portfolio item has a healed_image_url.
   * Toggles between "查看恢復照" and "查看原圖" labels.
   */
  healedToggle(): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(
        `${this.t('portfolio.viewHealed')}|${this.t('portfolio.viewOriginal')}`,
      ),
    })
  }

  // --- Actions ---

  /**
   * Navigate to an artist's profile page by slug.
   *
   * @param slug - The artist's URL slug, e.g. "inkmaster-alex"
   */
  async open(slug: string): Promise<void> {
    await this.goto(`/artists/${slug}`)
  }

  /**
   * Click the nth portfolio image (0-indexed) to open the lightbox.
   *
   * @param index - Zero-based index of the image in the grid
   */
  async openLightbox(index: number): Promise<void> {
    await this.portfolioImages().nth(index).click()
    await this.lightboxDialog().waitFor({ state: 'visible' })
  }
}
