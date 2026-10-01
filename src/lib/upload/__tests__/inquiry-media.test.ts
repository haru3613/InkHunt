import { describe, expect, it } from 'vitest'
import {
  buildProtectedInquiryMediaUrl,
  isOwnedInquiryMediaUrl,
  parseInquiryMediaPath,
  toProtectedInquiryMediaUrl,
} from '../inquiry-media'

const UID = '00000000-0000-4000-8000-000000000001'
const PATH = `${UID}/123e4567-e89b-12d3-a456-426614174000.jpg`

describe('inquiry media URLs', () => {
  it('builds and parses the stable same-origin protected URL', () => {
    const url = buildProtectedInquiryMediaUrl(PATH)
    expect(url).toBe(`/api/media/inquiries/${PATH}`)
    expect(parseInquiryMediaPath(url)).toBe(PATH)
    expect(isOwnedInquiryMediaUrl(url, UID)).toBe(true)
    expect(isOwnedInquiryMediaUrl(url, 'another-user')).toBe(false)
  })

  it('normalizes a legacy public Storage URL without carrying its host or query', () => {
    const legacy = `https://project.supabase.co/storage/v1/object/public/inquiries/${PATH}?download=1`
    expect(toProtectedInquiryMediaUrl(legacy)).toBe(`/api/media/inquiries/${PATH}`)
  })

  it('rejects traversal, extra path segments, unsupported extensions, and arbitrary URLs', () => {
    expect(parseInquiryMediaPath('/api/media/inquiries/user/../secret.jpg')).toBeNull()
    expect(parseInquiryMediaPath('/api/media/inquiries/user/folder/image.jpg')).toBeNull()
    expect(parseInquiryMediaPath('/api/media/inquiries/user/document.pdf')).toBeNull()
    expect(parseInquiryMediaPath('https://example.com/image.jpg')).toBeNull()
    expect(parseInquiryMediaPath(`https://example.com/evil/api/media/inquiries/${PATH}`)).toBeNull()
    expect(isOwnedInquiryMediaUrl(`https://evil.example/api/media/inquiries/${PATH}`, UID)).toBe(false)
  })
})
