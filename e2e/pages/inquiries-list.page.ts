import { type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the consumer inquiry list page (/inquiries).
 *
 * The page renders an authenticated-only list of past inquiries.  Each item
 * is rendered by <ChatList> as a <button> element containing the artist's
 * display name and the last message or the inquiry description as a preview.
 *
 * DOM structure (abridged):
 *
 *   <div>
 *     <div>
 *       <h1>"我的詢價"</h1>
 *     </div>
 *     <div>                                         — ChatList container
 *       <button>                                    — one per inquiry
 *         <div>{firstChar}</div>                    — avatar initial
 *         <div>
 *           <span>{artist_display_name}</span>
 *           <p>{last_message ?? inquiry.description}</p>
 *         </div>
 *         <span>{unread_count}</span>               — only when > 0
 *       </button>
 *       …
 *       <div>"還沒有任何對話"</div>                 — empty state
 *     </div>
 *   </div>
 *
 * Note: the page reads `data.data` from the API response.  The mock returns
 * `{ data: [...] }` for the inquiry list, shaped to match
 * `getInquiriesForConsumer()` output.
 */
export class InquiriesListPage extends BasePage {
  // --- Locators ---

  /** The page H1 "我的詢價" */
  pageTitle(): Locator {
    return this.page.getByRole('heading', { name: '我的詢價', level: 1 })
  }

  /**
   * All inquiry item buttons rendered by <ChatList>.
   * Each button contains an artist name span and a message preview paragraph.
   */
  inquiryItems(): Locator {
    return this.page
      .locator('button')
      .filter({ has: this.page.locator('span.text-sm.font-medium') })
  }

  /**
   * A single inquiry item whose visible artist name matches the given string.
   * Uses partial text matching so callers can pass a short prefix.
   *
   * @param artistName - The artist's display name as it appears in the list
   */
  getInquiryByArtist(artistName: string): Locator {
    return this.page
      .locator('button')
      .filter({ hasText: artistName })
  }

  // --- Actions ---

  /** Navigate to the consumer inquiry list page */
  async open(): Promise<void> {
    await this.goto('/inquiries')
  }

  /**
   * Click an inquiry item to navigate to the chat detail page.
   * Waits for the URL to change after clicking.
   *
   * @param artistName - The artist's display name whose inquiry to open
   */
  async openInquiry(artistName: string): Promise<void> {
    await this.getInquiryByArtist(artistName).click()
    await this.page.waitForURL(/\/inquiries\/[^/]+$/)
    await this.page.waitForLoadState('domcontentloaded')
  }
}
