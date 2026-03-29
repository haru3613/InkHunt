import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStyles = [
  { id: 1, slug: 'fine-line', name: '極簡線條', sort_order: 1, icon: null, image_url: null, created_at: '' },
  { id: 2, slug: 'micro', name: '微刺青', sort_order: 2, icon: null, image_url: null, created_at: '' },
]

vi.mock('@/lib/supabase/queries/styles', () => ({
  getAllStyles: vi.fn(),
}))

import { GET } from '../route'
import { getAllStyles } from '@/lib/supabase/queries/styles'

const mockGetAllStyles = vi.mocked(getAllStyles)

describe('GET /api/styles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns styles with data wrapper', async () => {
    mockGetAllStyles.mockResolvedValue(mockStyles as any)

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual(mockStyles)
  })

  it('returns empty array when no styles', async () => {
    mockGetAllStyles.mockResolvedValue([])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.data).toEqual([])
  })

  it('returns 500 on error', async () => {
    mockGetAllStyles.mockRejectedValue(new Error('DB connection failed'))

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBeDefined()
  })
})
