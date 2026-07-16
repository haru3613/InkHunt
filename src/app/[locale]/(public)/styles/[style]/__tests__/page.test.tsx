import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

const { getStyleBySlug, getAllStyles, getArtists } = vi.hoisted(() => ({
  getStyleBySlug: vi.fn(),
  getAllStyles: vi.fn(),
  getArtists: vi.fn(),
}))

const notFoundSpy = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
)

vi.mock('next/navigation', () => ({ notFound: notFoundSpy }))

vi.mock('@/lib/supabase/queries/styles', () => ({
  getStyleBySlug,
  getAllStyles,
}))

vi.mock('@/lib/supabase/queries/artists', () => ({
  getArtists,
}))

vi.mock('next-intl/server', () => ({
  setRequestLocale: vi.fn(),
  getTranslations: vi.fn(async () => (key: string, values?: Record<string, string | number>) =>
    values ? `${key}:${JSON.stringify(values)}` : key),
}))

vi.mock('@/components/shared/JsonLd', () => ({
  JsonLd: () => <div data-testid="json-ld" />,
}))

vi.mock('@/components/artists/ArtistCard', () => ({
  ArtistCard: ({ artist }: { artist: { display_name: string } }) => (
    <div data-testid="artist-card">{artist.display_name}</div>
  ),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
  }: {
    children: React.ReactNode
    href: string
  }) => <a href={href}>{children}</a>,
}))

import StylePage, {
  generateMetadata,
  generateStaticParams,
} from '../page'

const STYLE = {
  id: 's1',
  name: '日式傳統',
  slug: 'japanese-traditional',
  description: null,
}

describe('StylePage', () => {
  beforeEach(() => {
    getStyleBySlug.mockReset()
    getAllStyles.mockReset()
    getArtists.mockReset()
    notFoundSpy.mockClear()
  })

  it('generateStaticParams maps style slugs', async () => {
    getAllStyles.mockResolvedValue([STYLE, { ...STYLE, slug: 'blackwork' }])
    await expect(generateStaticParams()).resolves.toEqual([
      { style: 'japanese-traditional' },
      { style: 'blackwork' },
    ])
  })

  it('generateMetadata returns SEO fields for known style', async () => {
    getStyleBySlug.mockResolvedValue(STYLE)
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'zh-TW', style: STYLE.slug }),
    })
    expect(meta.title).toContain('recommendTitle')
    expect(meta.description).toContain('日式傳統')
    expect(meta.alternates?.canonical).toContain(`/zh-TW/styles/${STYLE.slug}`)
  })

  it('generateMetadata returns empty object when style missing', async () => {
    getStyleBySlug.mockResolvedValue(null)
    await expect(
      generateMetadata({
        params: Promise.resolve({ locale: 'zh-TW', style: 'missing' }),
      }),
    ).resolves.toEqual({})
  })

  it('renders artist grid for a style', async () => {
    getStyleBySlug.mockResolvedValue(STYLE)
    getArtists.mockResolvedValue({
      data: [
        { id: 'a1', display_name: 'Artist A', slug: 'a' },
        { id: 'a2', display_name: 'Artist B', slug: 'b' },
      ],
      total: 2,
    })

    const ui = await StylePage({
      params: Promise.resolve({ locale: 'zh-TW', style: STYLE.slug }),
    })
    render(ui)

    expect(screen.getByTestId('json-ld')).toBeInTheDocument()
    expect(screen.getAllByTestId('artist-card')).toHaveLength(2)
    expect(screen.getByText('Artist A')).toBeInTheDocument()
  })

  it('renders empty state when no artists', async () => {
    getStyleBySlug.mockResolvedValue(STYLE)
    getArtists.mockResolvedValue({ data: [], total: 0 })

    const ui = await StylePage({
      params: Promise.resolve({ locale: 'zh-TW', style: STYLE.slug }),
    })
    render(ui)

    expect(screen.getByText(/noArtists/)).toBeInTheDocument()
  })

  it('calls notFound when style does not exist', async () => {
    getStyleBySlug.mockResolvedValue(null)
    getArtists.mockResolvedValue({ data: [], total: 0 })

    await expect(
      StylePage({
        params: Promise.resolve({ locale: 'zh-TW', style: 'missing' }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
