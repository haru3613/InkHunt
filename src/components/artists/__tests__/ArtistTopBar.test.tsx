import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ArtistTopBar } from '../ArtistTopBar'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />
  },
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/zh-TW/artist/dashboard',
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
    [key: string]: unknown
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

describe('ArtistTopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nav items and initials when no avatar', () => {
    render(<ArtistTopBar artistName="Ink Wolf" avatarUrl={null} />)

    expect(screen.getByText('InkHunt')).toBeInTheDocument()
    // Desktop + mobile both render the same labels
    expect(screen.getAllByText('總覽').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('詢價').length).toBeGreaterThanOrEqual(1)
    // getInitials("Ink Wolf") → "IW"
    expect(screen.getByLabelText('帳號選單').textContent).toMatch(/IW|Ink Wolf/)
  })

  it('opens account dropdown and closes on Escape', async () => {
    const user = userEvent.setup()
    render(
      <ArtistTopBar
        artistName="Ink Wolf"
        avatarUrl="https://example.com/a.jpg"
      />,
    )

    await user.click(screen.getByLabelText('帳號選單'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '個人檔案' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '回到首頁' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows fallback name and ? initials when artistName is null', () => {
    render(<ArtistTopBar artistName={null} avatarUrl={null} />)
    expect(screen.getAllByText('刺青師').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('?')).toBeInTheDocument()
  })
})
