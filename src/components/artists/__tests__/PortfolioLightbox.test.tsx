import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { PortfolioItem } from '@/types/database'
import { PortfolioLightbox } from '../PortfolioLightbox'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-testid="lb-image" src={props.src as string} alt={String(props.alt ?? '')} />
  },
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

const items: PortfolioItem[] = [
  {
    id: 'p1',
    artist_id: 'a1',
    image_url: 'https://example.com/1.jpg',
    thumbnail_url: null,
    healed_image_url: 'https://example.com/1-healed.jpg',
    title: 'Dragon',
    description: null,
    body_part: '手臂',
    size_cm: '15',
    style_id: null,
    sort_order: 0,
    created_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'p2',
    artist_id: 'a1',
    image_url: 'https://example.com/2.jpg',
    thumbnail_url: null,
    healed_image_url: null,
    title: 'Rose',
    description: null,
    body_part: '腿',
    size_cm: null,
    style_id: null,
    sort_order: 1,
    created_at: '2026-01-02T00:00:00Z',
  },
]

describe('PortfolioLightbox', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  it('renders current item info and locks body scroll', () => {
    const onClose = vi.fn()
    render(
      <PortfolioLightbox items={items} initialIndex={0} onClose={onClose} />,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Dragon')).toBeInTheDocument()
    expect(screen.getByText('手臂')).toBeInTheDocument()
    expect(screen.getByText('15 cm')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('navigates with buttons and keyboard; Escape closes', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <PortfolioLightbox items={items} initialIndex={0} onClose={onClose} />,
    )

    await user.click(screen.getByLabelText('next'))
    expect(screen.getByText('Rose')).toBeInTheDocument()
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    await user.click(screen.getByLabelText('prev'))
    expect(screen.getByText('Dragon')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'ArrowRight' })
    expect(screen.getByText('Rose')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('toggles healed image when available', async () => {
    const user = userEvent.setup()
    render(
      <PortfolioLightbox items={items} initialIndex={0} onClose={vi.fn()} />,
    )

    const img = screen.getByTestId('lb-image')
    expect(img).toHaveAttribute('src', 'https://example.com/1.jpg')

    await user.click(screen.getByRole('button', { name: 'viewHealed' }))
    expect(screen.getByTestId('lb-image')).toHaveAttribute(
      'src',
      'https://example.com/1-healed.jpg',
    )

    await user.click(screen.getByRole('button', { name: 'viewOriginal' }))
    expect(screen.getByTestId('lb-image')).toHaveAttribute(
      'src',
      'https://example.com/1.jpg',
    )
  })

  it('calls onClose from close button', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <PortfolioLightbox items={items} initialIndex={0} onClose={onClose} />,
    )
    await user.click(screen.getByLabelText('close'))
    expect(onClose).toHaveBeenCalled()
  })
})
