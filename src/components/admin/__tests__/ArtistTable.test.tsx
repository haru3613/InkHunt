import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ArtistWithDetails } from '@/types/admin'
import { ArtistTable } from '../ArtistTable'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

function style(id: number, name: string, slug: string) {
  return {
    id,
    name,
    slug,
    icon: null,
    name_en: null,
    description: null,
    subtitle: null,
    group_name: null,
    color_profile: null,
    popularity: 0,
    sort_order: id,
  }
}

const baseArtist = (overrides: Partial<ArtistWithDetails>): ArtistWithDetails => ({
  id: 'a1',
  line_user_id: 'u1',
  display_name: 'Ink Wolf',
  slug: 'ink-wolf',
  bio: 'Specialist',
  avatar_url: null,
  city: '台北市',
  district: '大安區',
  address: null,
  lat: null,
  lng: null,
  ig_handle: 'inkwolf',
  price_min: 3000,
  price_max: 8000,
  pricing_note: null,
  deposit_amount: null,
  booking_notice: null,
  status: 'pending',
  is_claimed: true,
  featured: false,
  offers_coverup: false,
  offers_custom_design: false,
  has_flash_designs: false,
  quote_templates: [],
  admin_note: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  styles: [
    style(1, 'Blackwork', 'blackwork'),
    style(2, 'Dotwork', 'dotwork'),
    style(3, 'Fine Line', 'fine-line'),
    style(4, 'Watercolor', 'watercolor'),
  ],
  ...overrides,
})

describe('ArtistTable', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      }),
    )
  })

  it('shows empty state when no artists', () => {
    render(<ArtistTable artists={[]} onStatusChange={vi.fn()} />)
    expect(screen.getByText('沒有符合條件的刺青師')).toBeInTheDocument()
  })

  it('expands a row and shows pending approve/reject actions', async () => {
    const onStatusChange = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(
      <ArtistTable artists={[baseArtist({})]} onStatusChange={onStatusChange} />,
    )

    expect(screen.getByText('Ink Wolf')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Ink Wolf/ }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '核准上線' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '拒絕' })).toBeInTheDocument()
    expect(screen.getAllByText('Blackwork').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('+1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '核准上線' }))
    await waitFor(() => {
      expect(onStatusChange).toHaveBeenCalledWith('a1', 'active', '')
    })
  })

  it('shows resume action for suspended artists and surfaces action errors', async () => {
    const onStatusChange = vi.fn().mockRejectedValue(new Error('fail'))
    const user = userEvent.setup()
    render(
      <ArtistTable
        artists={[baseArtist({ status: 'suspended', id: 'a2', display_name: 'Banned' })]}
        onStatusChange={onStatusChange}
      />,
    )

    await user.click(screen.getByRole('button', { name: /Banned/ }))
    await user.click(screen.getByRole('button', { name: '重新上線' }))

    await waitFor(() => {
      expect(screen.getByText('操作失敗，請重試')).toBeInTheDocument()
    })
  })
})
