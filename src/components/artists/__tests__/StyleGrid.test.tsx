import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Database } from '@/types/database'

/**
 * Consuming test for StyleGrid (HAR-541): the landing discovery grid must show
 * a real approved-artist portfolio image when one exists for a style, and fall
 * back to the hardcoded `STYLE_IMAGES` / Unsplash placeholder only when a style
 * has no real work. `StyleGrid` is an async server component using
 * `next-intl/server`, so we mock the i18n layer + `next/image` + the i18n
 * `Link`, then `await` the component to get the tree and assert the rendered
 * `<img src>` per style.
 */

vi.mock('next-intl/server', () => ({
  getTranslations: vi.fn(async () => (key: string) => key),
}))

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...(props as Record<string, never>)} />
  },
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

import { StyleGrid } from '../StyleGrid'

type StyleRow = Database['public']['Tables']['styles']['Row']

function style(overrides: Partial<StyleRow>): StyleRow {
  return {
    id: 1,
    slug: 'fine-line',
    name: '極簡線條',
    icon: null,
    name_en: null,
    description: null,
    subtitle: null,
    group_name: null,
    color_profile: null,
    popularity: 0,
    sort_order: 1,
    ...overrides,
  }
}

async function renderGrid(
  styles: StyleRow[],
  sampleImages: Map<string, string>,
) {
  const ui = await StyleGrid({
    styles,
    artistCounts: new Map(),
    sampleImages,
  })
  return render(ui)
}

describe('StyleGrid — real portfolio image vs placeholder (HAR-541)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the real portfolio image when the map has one for that style', async () => {
    await renderGrid(
      [style({ slug: 'fine-line', name: '極簡線條' })],
      new Map([['fine-line', 'https://real/fine-line.jpg']]),
    )

    const img = screen.getByAltText('極簡線條') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('https://real/fine-line.jpg')
  })

  it('renders the placeholder image when the map has no real work for that style', async () => {
    await renderGrid([style({ slug: 'fine-line', name: '極簡線條' })], new Map())

    const img = screen.getByAltText('極簡線條') as HTMLImageElement
    // Falls back to the hardcoded STYLE_IMAGES['fine-line'] Unsplash placeholder,
    // never a real-work URL.
    expect(img.getAttribute('src')).toContain('unsplash.com')
    expect(img.getAttribute('src')).not.toContain('real/')
  })

  it('cold start hides zero-count label and shows coming-soon copy', async () => {
    const ui = await StyleGrid({
      styles: [style({ slug: 'floral', name: '花卉' })],
      artistCounts: new Map(),
      sampleImages: new Map(),
    })
    render(ui)
    expect(screen.getByText('styleComingSoon')).toBeInTheDocument()
    expect(screen.queryByText(/0/)).not.toBeInTheDocument()
  })

  it('with supply only renders styles that have artists', async () => {
    const ui = await StyleGrid({
      styles: [
        style({ id: 1, slug: 'fine-line', name: '極簡線條' }),
        style({ id: 2, slug: 'micro', name: '微刺青' }),
      ],
      artistCounts: new Map([['fine-line', 3]]),
      sampleImages: new Map([['fine-line', 'https://real/fine-line.jpg']]),
    })
    render(ui)
    expect(screen.getByAltText('極簡線條')).toBeInTheDocument()
    expect(screen.queryByAltText('微刺青')).not.toBeInTheDocument()
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('uses real portfolio image when a style has supply + sample map', async () => {
    const ui = await StyleGrid({
      styles: [
        style({ id: 1, slug: 'fine-line', name: '極簡線條' }),
        style({ id: 2, slug: 'micro', name: '微刺青' }),
      ],
      artistCounts: new Map([
        ['fine-line', 2],
        ['micro', 1],
      ]),
      sampleImages: new Map([['fine-line', 'https://real/fine-line.jpg']]),
    })
    render(ui)

    expect(
      (screen.getByAltText('極簡線條') as HTMLImageElement).getAttribute('src'),
    ).toBe('https://real/fine-line.jpg')
    expect(
      (screen.getByAltText('微刺青') as HTMLImageElement).getAttribute('src'),
    ).toContain('unsplash.com')
  })
})
