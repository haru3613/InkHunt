import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateUploadRequest,
  createSignedUploadUrl,
  extractStoragePath,
  deletePortfolioStorageObjects,
} from '../storage'

const mockCreateSignedUploadUrl = vi.fn()
const mockGetPublicUrl = vi.fn()
const mockStorageFrom = vi.fn(() => ({
  createSignedUploadUrl: mockCreateSignedUploadUrl,
  getPublicUrl: mockGetPublicUrl,
}))
const mockServerClient = { storage: { from: mockStorageFrom } }

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(async () => mockServerClient),
}))

describe('validateUploadRequest', () => {
  it('accepts valid image/jpeg', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid image/png', () => {
    const result = validateUploadRequest({
      bucket: 'inquiries',
      filename: 'ref.png',
      content_type: 'image/png',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid image/webp', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: 'photo.webp',
      content_type: 'image/webp',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid content type', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: 'doc.pdf',
      content_type: 'application/pdf',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid bucket', () => {
    const result = validateUploadRequest({
      bucket: 'secret',
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty filename', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: '',
      content_type: 'image/jpeg',
    })
    expect(result.success).toBe(false)
  })

  it('rejects missing fields', () => {
    const result = validateUploadRequest({})
    expect(result.success).toBe(false)
  })

  it('returns parsed data on success', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({
        bucket: 'portfolio',
        filename: 'photo.jpg',
        content_type: 'image/jpeg',
      })
    }
  })
})

describe('createSignedUploadUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://cdn.example.com/portfolio/user1/file.jpg' },
    })
  })

  it('returns signed_url, public_url, and path', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed?token=abc' },
      error: null,
    })

    const result = await createSignedUploadUrl('portfolio', 'user1', 'tattoo.jpg', 'image/jpeg')

    expect(result.signed_url).toBe('https://storage.example.com/signed?token=abc')
    expect(result.public_url).toBe('https://cdn.example.com/portfolio/user1/file.jpg')
    expect(result.path).toBeTruthy()
  })

  it('path contains userId and correct extension', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed?token=xyz' },
      error: null,
    })

    const result = await createSignedUploadUrl('portfolio', 'user42', 'artwork.png', 'image/png')

    expect(result.path).toMatch(/^user42\//)
    expect(result.path).toMatch(/\.png$/)
  })

  it('throws when createSignedUploadUrl fails with error message', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'bucket not found' },
    })

    await expect(
      createSignedUploadUrl('portfolio', 'user1', 'photo.jpg', 'image/jpeg')
    ).rejects.toThrow('Failed to create signed URL: bucket not found')
  })

  it("throws with 'unknown' when error has no message", async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: {},
    })

    await expect(
      createSignedUploadUrl('portfolio', 'user1', 'photo.jpg', 'image/jpeg')
    ).rejects.toThrow('Failed to create signed URL: unknown')
  })

  it('uses the extension from the filename for the generated path', async () => {
    mockCreateSignedUploadUrl.mockResolvedValue({
      data: { signedUrl: 'https://storage.example.com/signed?token=def' },
      error: null,
    })

    const result = await createSignedUploadUrl('portfolio', 'user1', 'design.webp', 'image/webp')

    expect(result.path).toMatch(/\.webp$/)
  })
})

describe('extractStoragePath', () => {
  it('extracts the path from a public storage URL for the given bucket', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/portfolio/artist-1/photo.jpg'
    expect(extractStoragePath('portfolio', url)).toBe('artist-1/photo.jpg')
  })

  it('returns null when the URL does not match the bucket', () => {
    const url = 'https://xyz.supabase.co/storage/v1/object/public/avatars/artist-1/photo.jpg'
    expect(extractStoragePath('portfolio', url)).toBeNull()
  })

  it('returns null for null/undefined input', () => {
    expect(extractStoragePath('portfolio', null)).toBeNull()
    expect(extractStoragePath('portfolio', undefined)).toBeNull()
  })
})

describe('deletePortfolioStorageObjects', () => {
  it('removes only the resolvable paths for the given urls, skipping nulls', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ data: null, error: null })
    const admin = {
      storage: { from: vi.fn(() => ({ remove: mockRemove })) },
    } as never

    await deletePortfolioStorageObjects(admin, [
      'https://xyz.supabase.co/storage/v1/object/public/portfolio/a/1.jpg',
      null,
      'https://xyz.supabase.co/storage/v1/object/public/portfolio/a/2.jpg',
    ])

    expect(mockRemove).toHaveBeenCalledWith(['a/1.jpg', 'a/2.jpg'])
  })

  it('is a no-op when no urls resolve to a storage path', async () => {
    const mockRemove = vi.fn()
    const admin = {
      storage: { from: vi.fn(() => ({ remove: mockRemove })) },
    } as never

    await deletePortfolioStorageObjects(admin, [null, undefined])

    expect(mockRemove).not.toHaveBeenCalled()
  })
})
