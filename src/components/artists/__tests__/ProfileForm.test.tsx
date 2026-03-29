import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/artist/profile',
}))

import { ProfileForm } from '../ProfileForm'

const mockStyles = [
  { id: 1, slug: 'fine-line', name: '極簡線條', sort_order: 1, icon: null, image_url: null, created_at: '' },
  { id: 2, slug: 'micro', name: '微刺青', sort_order: 2, icon: null, image_url: null, created_at: '' },
  { id: 3, slug: 'realism', name: '寫實', sort_order: 3, icon: null, image_url: null, created_at: '' },
]

describe('ProfileForm', () => {
  beforeEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders all form fields', () => {
    render(<ProfileForm artist={null} styles={[]} selectedStyleIds={[]} />)

    expect(screen.getByText('顯示名稱')).toBeInTheDocument()
    expect(screen.getByText('自我介紹')).toBeInTheDocument()
    expect(screen.getByText('城市')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    expect(screen.getByText('預約須知')).toBeInTheDocument()
    expect(screen.getByText('擅長風格')).toBeInTheDocument()
  })

  it('renders style buttons when styles provided', () => {
    render(<ProfileForm artist={null} styles={mockStyles as any} selectedStyleIds={[]} />)

    expect(screen.getByText('極簡線條')).toBeInTheDocument()
    expect(screen.getByText('微刺青')).toBeInTheDocument()
    expect(screen.getByText('寫實')).toBeInTheDocument()
  })

  it('shows selected styles with accent color', () => {
    render(<ProfileForm artist={null} styles={mockStyles as any} selectedStyleIds={[1, 3]} />)

    const fineLine = screen.getByText('極簡線條')
    const micro = screen.getByText('微刺青')
    const realism = screen.getByText('寫實')

    // Selected styles should have the accent bg class
    expect(fineLine.className).toContain('bg-[#C8A97E]')
    expect(realism.className).toContain('bg-[#C8A97E]')
    // Unselected should have the dark bg class
    expect(micro.className).toContain('bg-[#1F1F1F]')
  })

  it('toggles style selection on click', async () => {
    const user = userEvent.setup()
    render(<ProfileForm artist={null} styles={mockStyles as any} selectedStyleIds={[]} />)

    const microButton = screen.getByText('微刺青')
    expect(microButton.className).toContain('bg-[#1F1F1F]')

    await user.click(microButton)
    expect(microButton.className).toContain('bg-[#C8A97E]')

    await user.click(microButton)
    expect(microButton.className).toContain('bg-[#1F1F1F]')
  })

  it('shows submit button with correct text for new artist', () => {
    render(<ProfileForm artist={null} styles={[]} selectedStyleIds={[]} />)
    expect(screen.getByText('提交申請')).toBeInTheDocument()
  })

  it('shows submit button with correct text for existing artist', () => {
    const existingArtist = {
      id: '1', slug: 'harvey', display_name: 'Harvey', bio: null,
      city: '桃園市', district: null, address: null,
      price_min: 1000, price_max: null, ig_handle: null,
      pricing_note: null, booking_notice: null, avatar_url: null,
      status: 'active', featured: false, is_claimed: true,
      lat: null, lng: null, offers_coverup: false,
      offers_custom_design: false, has_flash_designs: false,
      deposit_amount: null, line_user_id: 'U123',
      admin_note: null, created_at: '', updated_at: '',
    }
    render(<ProfileForm artist={existingArtist as any} styles={[]} selectedStyleIds={[]} />)
    expect(screen.getByText('儲存')).toBeInTheDocument()
  })

  it('calls POST /api/artists for new artist on submit', async () => {
    const user = userEvent.setup()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ slug: 'new-artist' }), { status: 200 })
    )

    render(<ProfileForm artist={null} styles={[]} selectedStyleIds={[]} />)

    // Use placeholder to find specific inputs
    const cityInput = screen.getByPlaceholderText('台北市')
    await user.type(cityInput, '台北市')

    // display_name has no placeholder; it's the first required input without one
    const allInputs = screen.getAllByRole('textbox')
    // First textbox is display_name (the input without a placeholder, before the textarea)
    await user.type(allInputs[0], 'TestArtist')

    await user.click(screen.getByText('提交申請'))

    expect(fetchSpy).toHaveBeenCalledWith('/api/artists', expect.objectContaining({
      method: 'POST',
    }))

    fetchSpy.mockRestore()
  })
})
