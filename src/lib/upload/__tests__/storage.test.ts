import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateUploadRequest, createSignedUploadUrl } from '../storage'

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
