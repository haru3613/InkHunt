import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { revalidatePath } from 'next/cache'
import { revalidateArtistPage } from '../revalidate-artist'

const mockRevalidatePath = vi.mocked(revalidatePath)

describe('revalidateArtistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('revalidates the public artist detail page for every locale (HAR-664)', () => {
    revalidateArtistPage('ink-master')

    expect(mockRevalidatePath).toHaveBeenCalledWith('/zh-TW/artists/ink-master')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/en/artists/ink-master')
    expect(mockRevalidatePath).toHaveBeenCalledTimes(2)
  })
})
