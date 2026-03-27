import { describe, it, expect } from 'vitest'
import { validateUploadRequest } from '../storage'

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
