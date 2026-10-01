import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockStorageFrom = vi.fn()
const mockFrom = vi.fn()
const mockContains = vi.fn().mockResolvedValue({ data: [], error: null })

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    storage: { from: mockStorageFrom },
  })),
}))

import { canReadInquiryMedia } from '../inquiry-media-server'

const PATH = '00000000-0000-4000-8000-000000000001/object.jpg'
const user = {
  supabaseId: '00000000-0000-4000-8000-000000000099',
  lineUserId: 'U-consumer',
  displayName: 'Consumer',
  avatarUrl: null,
}

function configureDatabase(consumerLineId: string) {
  mockStorageFrom.mockReturnValue({
    getPublicUrl: vi.fn(() => ({
      data: {
        publicUrl: `https://project.supabase.co/storage/v1/object/public/inquiries/${PATH}`,
      },
    })),
  })

  mockFrom.mockImplementation((table: string) => {
    if (table === 'messages') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({ data: [{ inquiry_id: 'inquiry-1' }], error: null }),
          })),
        })),
      }
    }
    if (table === 'artists') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      }
    }
    return {
      select: vi.fn(() => ({
        contains: mockContains,
        in: vi.fn().mockResolvedValue({
          data: [{
            id: 'inquiry-1',
            artist_id: 'artist-1',
            consumer_line_id: consumerLineId,
          }],
          error: null,
        }),
      })),
    }
  })
}

describe('canReadInquiryMedia', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContains.mockResolvedValue({ data: [], error: null })
  })

  it('allows a participant of the inquiry that references the object', async () => {
    configureDatabase(user.lineUserId)
    await expect(canReadInquiryMedia(user, PATH)).resolves.toBe(true)
  })

  it('denies an authenticated non-participant even when the object is referenced', async () => {
    configureDatabase('U-someone-else')
    await expect(canReadInquiryMedia(user, PATH)).resolves.toBe(false)
  })

  it('serializes the JSONB containment operand instead of passing a Postgres array', async () => {
    configureDatabase(user.lineUserId)
    await canReadInquiryMedia(user, PATH)

    expect(mockContains).toHaveBeenCalledWith(
      'reference_images',
      expect.stringMatching(/^\["\/api\/media\/inquiries\//),
    )
  })

  it('allows the opaque Auth UID uploader without querying reference records', async () => {
    await expect(
      canReadInquiryMedia({ ...user, supabaseId: PATH.split('/')[0] }, PATH),
    ).resolves.toBe(true)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('retains uploader access to legacy LINE-ID paths after the bucket becomes private', async () => {
    const legacyPath = `${user.lineUserId}/legacy-object.jpg`
    await expect(canReadInquiryMedia(user, legacyPath)).resolves.toBe(true)
    expect(mockFrom).not.toHaveBeenCalled()
  })
})
