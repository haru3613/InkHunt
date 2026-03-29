/**
 * Unit tests: deletePortfolioItem — storage cascade behaviour.
 *
 * Verifies that deleting a portfolio item:
 *   1. Removes the DB row from portfolio_items.
 *   2. Deletes the corresponding file from Supabase Storage bucket "portfolio".
 *   3. Does NOT throw if the storage delete fails (non-fatal — DB row is still gone).
 *
 * The function under test does not yet exist in the codebase.
 * This test acts as a TDD specification; implement deletePortfolioItem in
 * src/lib/supabase/queries/portfolio.ts and export it from there.
 *
 * Expected signature:
 *
 *   export async function deletePortfolioItem(
 *     artistId: string,
 *     itemId: string,
 *   ): Promise<void>
 *
 * Expected implementation steps:
 *   1. Fetch the portfolio_items row to get image_url.
 *   2. Delete the row from portfolio_items (filtered by id AND artist_id for RLS safety).
 *   3. Derive the storage path from image_url:
 *        new URL(image_url).pathname  →  strip leading "/storage/v1/object/public/portfolio/"
 *        or extract the path segment after the bucket name.
 *   4. Call admin.storage.from('portfolio').remove([storagePath]).
 *      If this call fails, log but do not re-throw.
 *
 * Mock strategy:
 *   - `createAdminClient` is mocked to return a client stub with both
 *     `.from()` (DB queries) and `.storage` (Storage API).
 *   - We use the same `makeThenable` helper pattern from artists.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock createAdminClient before any imports that use it
// ---------------------------------------------------------------------------

const mockRemove = vi.fn()
const mockStorageFrom = vi.fn().mockReturnValue({ remove: mockRemove })
const mockFrom = vi.fn()

const mockClient = {
  from: mockFrom,
  storage: { from: mockStorageFrom },
}

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => mockClient,
}))

// Import after the mock is in place.
// This import will fail until deletePortfolioItem is created — that is intentional.
import { deletePortfolioItem } from '../portfolio'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a chainable Supabase query stub that resolves to `result`. */
function makeChain<T>(result: T) {
  const chain: Record<string, unknown> = {
    then: (fn: (v: T) => void) => Promise.resolve(fn(result)),
  }
  chain.select = vi.fn().mockReturnValue(chain)
  chain.eq = vi.fn().mockReturnValue(chain)
  chain.single = vi.fn().mockResolvedValue(result)
  chain.delete = vi.fn().mockReturnValue(chain)
  return chain
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ARTIST_ID = 'artist-001'
const ITEM_ID = 'portfolio-item-abc'

/**
 * A realistic Supabase Storage public URL.
 * The path after the bucket name is:  "{artistId}/{timestamp}-{random}.jpg"
 * deletePortfolioItem must extract "artist-001/1234567890-abcdef.jpg" as the
 * storage path to pass to remove().
 */
const IMAGE_URL =
  'https://xyzproject.supabase.co/storage/v1/object/public/portfolio/artist-001/1234567890-abcdef.jpg'

const STORAGE_PATH = 'artist-001/1234567890-abcdef.jpg'

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('deletePortfolioItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes the DB row from portfolio_items filtered by item id and artist id', async () => {
    // Arrange: fetch returns the item, delete succeeds
    const fetchChain = makeChain({ data: { id: ITEM_ID, image_url: IMAGE_URL }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    mockRemove.mockResolvedValue({ data: [{ name: STORAGE_PATH }], error: null })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      // First call: SELECT to fetch the item's image_url
      // Second call: DELETE the row
      return callIndex === 1 ? fetchChain : deleteChain
    })

    await deletePortfolioItem(ARTIST_ID, ITEM_ID)

    // The DELETE must be scoped to the specific item and artist
    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('id', ITEM_ID)
    expect(deleteChain.eq).toHaveBeenCalledWith('artist_id', ARTIST_ID)
  })

  it('calls storage.from("portfolio").remove() with the correct file path', async () => {
    const fetchChain = makeChain({ data: { id: ITEM_ID, image_url: IMAGE_URL }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    mockRemove.mockResolvedValue({ data: [{ name: STORAGE_PATH }], error: null })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      return callIndex === 1 ? fetchChain : deleteChain
    })

    await deletePortfolioItem(ARTIST_ID, ITEM_ID)

    expect(mockStorageFrom).toHaveBeenCalledWith('portfolio')
    expect(mockRemove).toHaveBeenCalledWith([STORAGE_PATH])
  })

  it('does not throw if storage.remove() fails — DB delete is non-fatal winner', async () => {
    const fetchChain = makeChain({ data: { id: ITEM_ID, image_url: IMAGE_URL }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    // Storage delete returns an error
    mockRemove.mockResolvedValue({ data: null, error: { message: 'Object not found' } })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      return callIndex === 1 ? fetchChain : deleteChain
    })

    // Must NOT throw even though storage.remove() returned an error
    await expect(deletePortfolioItem(ARTIST_ID, ITEM_ID)).resolves.toBeUndefined()

    // DB delete was still attempted
    expect(deleteChain.delete).toHaveBeenCalled()
  })

  it('does not throw if storage.remove() rejects — DB delete still completes', async () => {
    const fetchChain = makeChain({ data: { id: ITEM_ID, image_url: IMAGE_URL }, error: null })
    const deleteChain = makeChain({ data: null, error: null })
    // Storage delete throws (network-level failure)
    mockRemove.mockRejectedValue(new Error('Network error'))

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      return callIndex === 1 ? fetchChain : deleteChain
    })

    await expect(deletePortfolioItem(ARTIST_ID, ITEM_ID)).resolves.toBeUndefined()
    expect(deleteChain.delete).toHaveBeenCalled()
  })

  it('throws if the DB delete itself fails', async () => {
    const fetchChain = makeChain({ data: { id: ITEM_ID, image_url: IMAGE_URL }, error: null })
    const deleteChain = makeChain({ data: null, error: { message: 'RLS policy violation' } })
    mockRemove.mockResolvedValue({ data: [], error: null })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      return callIndex === 1 ? fetchChain : deleteChain
    })

    await expect(deletePortfolioItem(ARTIST_ID, ITEM_ID)).rejects.toThrow(
      /Failed to delete portfolio item/,
    )
  })

  it('throws if the item does not exist (SELECT returns null)', async () => {
    const fetchChain = makeChain({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(fetchChain)

    await expect(deletePortfolioItem(ARTIST_ID, ITEM_ID)).rejects.toThrow(
      /Portfolio item not found/,
    )

    // Storage and DB delete must NOT be called if the item doesn't exist
    expect(mockStorageFrom).not.toHaveBeenCalled()
  })

  it('handles image_url without a recognisable storage path gracefully', async () => {
    // Some legacy items might have an image_url that is a relative path or
    // an external CDN URL without the Supabase storage pattern.
    // In that case, remove() should be called with an empty array or skipped —
    // never crash.
    const externalImageUrl = 'https://cdn.external.com/some-image.jpg'
    const fetchChain = makeChain({
      data: { id: ITEM_ID, image_url: externalImageUrl },
      error: null,
    })
    const deleteChain = makeChain({ data: null, error: null })
    mockRemove.mockResolvedValue({ data: [], error: null })

    let callIndex = 0
    mockFrom.mockImplementation(() => {
      callIndex++
      return callIndex === 1 ? fetchChain : deleteChain
    })

    // Must not throw
    await expect(deletePortfolioItem(ARTIST_ID, ITEM_ID)).resolves.toBeUndefined()
    // DB delete still happened
    expect(deleteChain.delete).toHaveBeenCalled()
  })
})
