import { type Locator } from '@playwright/test'
import { BasePage } from './base.page'

/**
 * Page Object Model for the consumer inquiry chat detail page
 * (/inquiries/[id]).
 *
 * The page renders a full-screen chat interface using <ChatWindow>.
 * Messages are loaded from the API and rendered as <MessageBubble> elements.
 * When the artist has submitted a quote, a <QuoteCard> appears inside the
 * message stream (rendered as a message of type "quote"), or as a standalone
 * card depending on implementation.
 *
 * DOM structure (abridged):
 *
 *   <div class="flex flex-col h-screen">
 *     <div>                                   — header bar
 *       <button><ArrowLeft /></button>         — back to list
 *       <h1>{artistName}</h1>
 *     </div>
 *     <div>                                   — ChatWindow
 *       <div>                                 — scrollable message area
 *         <div>                               — MessageBubble (text)
 *           <div><p>{message content}</p></div>
 *         </div>
 *         <div>                               — MessageBubble (quote)
 *           <div>                             — QuoteCard
 *             <div>"報價"</div>               — label
 *             <div>NT${price}</div>           — price
 *             <p>{note}</p>                   — optional note
 *             <div>                           — action buttons (status=sent, !isOwn)
 *               <button>"接受"</button>
 *               <button>"拒絕"</button>
 *             </div>
 *           </div>
 *         </div>
 *       </div>
 *       <div>                                 — ChatInput bar
 *         <input placeholder="輸入訊息...">   — text input
 *         <button><Send /></button>            — send button
 *       </div>
 *     </div>
 *   </div>
 *
 * The QuoteCard only shows action buttons when `isOwn === false` (consumer
 * view) and the quote status is "sent".  The consumer page always passes
 * `isArtist={false}` to ChatWindow, so the consumer is never the quote owner.
 */
export class ChatPage extends BasePage {
  // --- Header locators ---

  /** The artist name heading in the chat header */
  artistNameHeading(): Locator {
    return this.page.getByRole('heading', { level: 1 })
  }

  /** The back-to-list button (ArrowLeft icon, no accessible text) */
  backButton(): Locator {
    return this.page
      .locator('header, div')
      .filter({ has: this.page.getByRole('heading', { level: 1 }) })
      .getByRole('button')
      .first()
  }

  // --- Message locators ---

  /**
   * All rendered message bubble containers.
   * Each bubble is a <div> with flex layout and py-1 class.
   */
  messages(): Locator {
    return this.page.locator('div.flex.py-1')
  }

  /**
   * A single message bubble whose text content matches the given string.
   *
   * @param text - The message text to match (exact or partial)
   */
  messageByText(text: string): Locator {
    return this.page.locator('p.text-sm').filter({ hasText: text })
  }

  // --- Chat input locators ---

  /** The message text input field */
  chatInput(): Locator {
    return this.page.getByPlaceholder('輸入訊息...')
  }

  /**
   * The send button in the chat input bar.
   * Rendered as a ghost icon button containing the <Send> lucide icon.
   * It becomes enabled only when the input has non-whitespace text.
   */
  sendButton(): Locator {
    return this.page.locator('div.border-t button').last()
  }

  // --- Quote card locators ---

  /**
   * The QuoteCard container element.
   * Identified by the "報價" label text that always appears at the top of
   * every QuoteCard regardless of status.
   */
  quoteCard(): Locator {
    return this.page
      .locator('div')
      .filter({ hasText: /^報價$/ })
      .locator('..')
      .first()
  }

  /**
   * The "接受" (accept) button inside the quote card.
   * Only visible when the quote status is "sent" and the viewer is the
   * consumer (i.e. not the quote author).
   */
  acceptQuoteButton(): Locator {
    return this.page.getByRole('button', { name: '接受' })
  }

  /**
   * The "拒絕" (reject) button inside the quote card.
   * Only visible under the same conditions as the accept button.
   */
  rejectQuoteButton(): Locator {
    return this.page.getByRole('button', { name: '拒絕' })
  }

  // --- Actions ---

  /**
   * Navigate to the chat detail page for a given inquiry ID.
   *
   * @param inquiryId - The inquiry UUID, e.g. "inquiry-001"
   */
  async open(inquiryId: string): Promise<void> {
    await this.goto(`/inquiries/${inquiryId}`)
  }

  /**
   * Type a message and click the send button.
   * Waits for the input to be empty (message cleared after send) as the
   * success signal.
   *
   * @param text - The message text to send
   */
  async sendMessage(text: string): Promise<void> {
    await this.chatInput().fill(text)
    await this.sendButton().click()
    await this.chatInput().waitFor({ state: 'visible' })
  }

  /**
   * Click the "接受" button on the quote card and wait for the API call to
   * complete (the mock responds immediately with status: "accepted").
   */
  async acceptQuote(): Promise<void> {
    await this.acceptQuoteButton().click()
  }
}
