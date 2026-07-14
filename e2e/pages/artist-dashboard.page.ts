import { type Page, type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * POM for /artist/inquiries.
 *
 * HAR-665: the split-pane chat view (ChatList + ChatWindow) lives at
 * /artist/inquiries, not /artist/dashboard — /artist/dashboard is a
 * separate overview page with no chat UI. All text is hardcoded Chinese.
 */
export class ArtistDashboardPage extends BasePage {
  constructor(page: Page) {
    super(page)
  }

  async goto() {
    await super.goto('/artist/inquiries')
  }

  // ---------------------------------------------------------------------------
  // Left panel — inquiry list
  // ---------------------------------------------------------------------------

  /** "詢價管理" heading in the left panel */
  dashboardTitle(): Locator {
    return this.page.getByRole('heading', { name: '詢價管理', level: 1 })
  }

  /** The scrollable list of inquiry items */
  inquiryList(): Locator {
    return this.page.locator('[data-testid="chat-list"], .flex.flex-col.overflow-y-auto').first()
  }

  /**
   * A single inquiry item in the list, matched by the consumer's display name.
   * The ChatList renders consumer names as button text when viewAs="artist".
   */
  inquiryItem(consumerName: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(consumerName) })
  }

  // ---------------------------------------------------------------------------
  // Right panel — chat window
  // ---------------------------------------------------------------------------

  /** The chat window container (right panel) */
  chatWindow(): Locator {
    return this.page.locator('.flex.flex-col.h-full').first()
  }

  /** Text input inside ChatInput: placeholder "輸入訊息..." */
  chatInput(): Locator {
    return this.page.getByPlaceholder('輸入訊息...')
  }

  /** Send button (the Send icon button in ChatInput) */
  sendButton(): Locator {
    // The Send button is the last button in the ChatInput bar (border-t container)
    return this.page.locator('div.border-t button').last()
  }

  /** Quote button (DollarSign icon, artist-only) */
  quoteButton(): Locator {
    return this.page.locator('button svg.lucide-dollar-sign').locator('..')
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  /**
   * A nav link in ArtistTopBar (see src/components/artists/ArtistTopBar.tsx).
   * Works for both the desktop sidebar and the mobile bottom tab bar.
   * @param label — one of: '總覽', '詢價', '作品集', '檔案' (no settings item exists)
   */
  navLink(label: string): Locator {
    return this.page.getByRole('link', { name: label })
  }

  // ---------------------------------------------------------------------------
  // Compound actions
  // ---------------------------------------------------------------------------

  /** Click an inquiry in the list to open its chat window */
  async openInquiry(consumerName: string) {
    await this.inquiryItem(consumerName).click()
    await this.page.waitForLoadState('networkidle').catch(() => {
      // ChatWindow uses Realtime — network never fully idles
    })
  }

  /** Type a message and submit it with the send button */
  async sendMessage(text: string) {
    await this.chatInput().fill(text)
    // Send via keyboard to exercise the keydown handler as well
    await this.chatInput().press('Enter')
  }

  /**
   * Navigate to another section of the artist dashboard.
   * @param navLabel — one of: '總覽', '詢價', '作品集', '檔案'
   */
  async navigateTo(navLabel: string) {
    await this.navLink(navLabel).first().click()
    await this.waitForHydration()
  }
}
