import path from 'node:path'
import { test, expect } from '../../fixtures'
import { ChatPage } from '../../pages/chat.page'
import { TEST_INQUIRY } from '../../fixtures/test-data'

/**
 * E2E tests for sending an image inside the inquiry chat.
 *
 * The upload flow in ChatInput.tsx is:
 *   1. User clicks the lucide <Image> icon button.
 *   2. A hidden <input type="file" accept="image/jpeg,image/png,image/webp"> is triggered.
 *   3. onChange calls uploadFile('inquiries', file) from src/lib/upload/client.ts.
 *   4. client.ts POSTs to /api/upload/signed-url ->receives { signed_url, public_url }.
 *   5. client.ts PUTs the file bytes to signed_url.
 *   6. onSendMessage('image', public_url) is called, which POSTs to /api/inquiries/:id/messages.
 *   7. The returned message (type: "image") renders as <img> in the chat window.
 *
 * The api-mocks fixture (auto: true) already intercepts:
 *   - /api/upload/signed-url  ->but returns camelCase keys (signedUrl / publicUrl).
 *     client.ts expects snake_case (signed_url / public_url), so we override this
 *     route inside the test to return the correct shape.
 *   - /api/inquiries/*/messages (POST) ->returns a stub new message.
 *
 * We add targeted route overrides for the upload step so assertions can be made
 * on whether both network calls were attempted.
 */

const TEST_IMAGE_PATH = path.resolve(
  __dirname,
  '../../fixtures/test-images/test-1x1.png',
)

test.describe('Chat: Image Upload', () => {
  test('artist can send an image in the inquiry chat', async ({ artistPage }) => {
    const chat = new ChatPage(artistPage)

    // Track whether each upload-related network call was made.
    let signedUrlRequested = false
    let storagePutAttempted = false
    let messageSent = false

    await test.step('Given: override /api/upload/signed-url to return snake_case keys', async () => {
      // The global api-mocks fixture returns camelCase keys; client.ts needs
      // snake_case.  We override (higher-priority route) here to fix that so
      // the upload flow actually proceeds past the destructure.
      await artistPage.route('**/api/upload/signed-url', (route) => {
        signedUrlRequested = true
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            signed_url: 'https://storage.example.com/upload-target',
            public_url: 'https://storage.example.com/public/test-1x1.png',
            path: 'inquiries/test-1x1.png',
          }),
        })
      })
    })

    await test.step('And: intercept the Supabase Storage PUT to confirm the file bytes are sent', async () => {
      await artistPage.route('https://storage.example.com/upload-target', (route) => {
        storagePutAttempted = true
        return route.fulfill({ status: 200 })
      })
    })

    await test.step('And: intercept message POST to confirm image URL is sent', async () => {
      await artistPage.route(
        `**/api/inquiries/${TEST_INQUIRY.id}/messages`,
        (route) => {
          if (route.request().method() === 'POST') {
            messageSent = true
            const body = route.request().postDataJSON() as { content?: string; message_type?: string }
            // Fulfill with the image message shape so the chat window renders it
            return route.fulfill({
              status: 201,
              contentType: 'application/json',
              body: JSON.stringify({
                id: 'msg-img-001',
                inquiry_id: TEST_INQUIRY.id,
                sender_type: 'artist',
                message_type: 'image',
                content: body?.content ?? 'https://storage.example.com/public/test-1x1.png',
                metadata: {},
                created_at: new Date().toISOString(),
              }),
            })
          }
          return route.continue()
        },
      )
    })

    await test.step('And: artist navigates to the inquiry chat', async () => {
      await chat.open(TEST_INQUIRY.id)
      await expect(chat.chatInput()).toBeVisible()
    })

    await test.step('When: artist clicks the image icon button', async () => {
      // The image button is the first ghost icon button in the ChatInput bar.
      // It triggers fileInputRef.current?.click() which opens the hidden file input.
      const imageButton = artistPage
        .locator('div.border-t button')
        .first()
      await expect(imageButton).toBeVisible()
      // Do NOT .click() here — that would open the OS file picker.
      // Instead use setInputFiles on the hidden input directly (Playwright best practice).
    })

    await test.step('And: select a test image via the hidden file input', async () => {
      // Playwright intercepts the file chooser triggered by clicking the button.
      // We wait for the filechooser event, then provide our test PNG.
      const [fileChooser] = await Promise.all([
        artistPage.waitForEvent('filechooser'),
        artistPage.locator('div.border-t button').first().click(),
      ])
      await fileChooser.setFiles(TEST_IMAGE_PATH)
    })

    await test.step('Then: the signed URL endpoint was called', async () => {
      // Give the async upload chain time to complete before asserting.
      await artistPage.waitForTimeout(500)
      expect(signedUrlRequested, 'Expected POST to /api/upload/signed-url').toBe(true)
    })

    await test.step('And: the file bytes were PUT to the storage URL', async () => {
      expect(storagePutAttempted, 'Expected PUT to Supabase storage signed URL').toBe(true)
    })

    await test.step('And: an image message was posted to the chat messages endpoint', async () => {
      expect(messageSent, 'Expected POST to /api/inquiries/:id/messages with image').toBe(true)
    })

    await test.step('And: an <img> element appears in the chat window', async () => {
      // After onSendMessage('image', public_url) the server returns a message with
      // message_type: 'image'.  The chat renderer should show an <img>.
      await expect(
        artistPage.locator('img[src*="storage.example.com"]'),
      ).toBeVisible({ timeout: 5_000 })
    })
  })

  test('uploading an oversized file does not crash the chat', async ({ artistPage }) => {
    const chat = new ChatPage(artistPage)

    await test.step('Given: the signed-url endpoint returns an error for large files', async () => {
      // client.ts enforces a 10 MB local guard before hitting the network.
      // We simulate what happens when that guard triggers by overriding the endpoint
      // to return 413 — the catch block in handleImageSelect should swallow the error.
      await artistPage.route('**/api/upload/signed-url', (route) =>
        route.fulfill({ status: 413, body: 'File too large' }),
      )
    })

    await test.step('And: artist is in the chat', async () => {
      await chat.open(TEST_INQUIRY.id)
      await expect(chat.chatInput()).toBeVisible()
    })

    await test.step('When: artist selects the test image', async () => {
      const [fileChooser] = await Promise.all([
        artistPage.waitForEvent('filechooser'),
        artistPage.locator('div.border-t button').first().click(),
      ])
      await fileChooser.setFiles(TEST_IMAGE_PATH)
      // Short wait for the async handler to complete
      await artistPage.waitForTimeout(300)
    })

    await test.step('Then: the chat input is still usable — no crash or disabled state', async () => {
      await expect(chat.chatInput()).toBeVisible()
      await expect(chat.chatInput()).toBeEnabled()
    })

    await test.step('And: no image <img> was inserted into the message list', async () => {
      const imageMessages = artistPage.locator('img[src*="storage.example.com"]')
      await expect(imageMessages).toHaveCount(0)
    })
  })
})
