import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockStyles = [
  { id: 1, slug: 'fine-line', name: '極簡線條', sort_order: 1, icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 0 },
  { id: 2, slug: 'micro', name: '微刺青', sort_order: 2, icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 0 },
]

vi.mock('@/lib/supabase/queries/styles', () => ({
  getAllStyles: vi.fn(),
}))

vi.mock('@/lib/auth/helpers', () => ({
  handleApiError: (err: unknown) => {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  },
}))

import { GET } from '../route'
import { getAllStyles } from '@/lib/supabase/queries/styles'

const mockGetAllStyles = vi.mocked(getAllStyles)

describe('GET /api/styles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns styles with data wrapper', async () => {
    mockGetAllStyles.mockResolvedValue(mockStyles as Awaited<ReturnType<typeof getAllStyles>>)

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
