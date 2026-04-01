import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}))

import { POST } from '../route'
import { createServerClient } from '@/lib/supabase/server'

const mockCreateServerClient = vi.mocked(createServerClient)

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls supabase.auth.signOut', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({
      auth: { signOut },
    } as never)

    await POST()

    expect(signOut).toHaveBeenCalledOnce()
  })

  it('returns { ok: true }', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    mockCreateServerClient.mockResolvedValue({
      auth: { signOut },
    } as never)

    const response = await POST()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ ok: true })
  })
})
