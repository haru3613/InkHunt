import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * POM for /artist/portfolio — the PortfolioManageGrid + PortfolioUploader page.
 *
 * All text is hardcoded Chinese from the portfolio page and its components.
 */
export class ArtistPortfolioPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/artist/portfolio')
  }

  // ---------------------------------------------------------------------------
  // Page-level elements
  // ---------------------------------------------------------------------------

  /** "作品集管理" h1 */
  pageHeading(): Locator {
    return this.page.getByRole('heading', { name: '作品集管理', level: 1 })
  }

  /** Item count label — e.g. "3 件作品" */
  itemCountLabel(): Locator {
    return this.page.getByText(/\d+ 件作品/)
  }

  // ---------------------------------------------------------------------------
  // PortfolioManageGrid
  // ---------------------------------------------------------------------------

  /**
   * The grid container.  PortfolioManageGrid renders a CSS grid when items
   * are present, or an empty-state paragraph when the list is empty.
   */
  portfolioGrid(): Locator {
    return this.page.locator('.grid.grid-cols-2')
  }

  /**
   * All portfolio item wrappers inside the grid.
   * Each item is a `div.group.relative.aspect-square`.
   */
  portfolioItems(): Locator {
    return this.page.locator('.group.relative.aspect-square')
  }

  /**
   * The empty-state message shown when the artist has no portfolio items yet.
   */
  emptyState(): Locator {
    return this.page.getByText('還沒有任何作品，點擊上方按鈕開始上傳')
  }

  // ---------------------------------------------------------------------------
  // PortfolioUploader
  // ---------------------------------------------------------------------------

  /**
   * "上傳作品" button that opens the hidden file picker.
   * When upload is in progress the text becomes "上傳中 N%".
   */
  uploadButton(): Locator {
    return this.page.getByRole('button', { name: /上傳作品|上傳中/ })
  }

  // ---------------------------------------------------------------------------
  // Per-item actions (revealed on hover via group-hover CSS)
  // ---------------------------------------------------------------------------

  /**
   * Delete button for the item at the given 0-based index.
   * The Trash2 icon button is inside the hover overlay of each grid cell.
   */
  deleteButton(index: number): Locator {
    return this.portfolioItems().nth(index).getByRole('button').filter({
      has: this.page.locator('svg.lucide-trash-2'),
    })
  }

  /**
   * Hover over a portfolio item to reveal its action buttons, then click
   * the delete button for the item at the given 0-based index.
   */
  async deleteItem(index: number) {
    const item = this.portfolioItems().nth(index)
    await item.hover()
    await this.deleteButton(index).click()
  }
}
