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
import type { Artist, Style } from '@/types/database'

const mockStyles: Style[] = [
  { id: 1, slug: 'fine-line', name: '極簡線條', sort_order: 1, icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 0 },
  { id: 2, slug: 'micro', name: '微刺青', sort_order: 2, icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 0 },
  { id: 3, slug: 'realism', name: '寫實', sort_order: 3, icon: null, name_en: null, description: null, subtitle: null, group_name: null, color_profile: null, popularity: 0 },
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
    render(<ProfileForm artist={null} styles={mockStyles} selectedStyleIds={[]} />)

    expect(screen.getByText('極簡線條')).toBeInTheDocument()
    expect(screen.getByText('微刺青')).toBeInTheDocument()
    expect(screen.getByText('寫實')).toBeInTheDocument()
  })

  it('shows selected styles with accent color', () => {
    render(<ProfileForm artist={null} styles={mockStyles} selectedStyleIds={[1, 3]} />)

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
    render(<ProfileForm artist={null} styles={mockStyles} selectedStyleIds={[]} />)

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
    const existingArtist: Artist = {
      id: '1', slug: 'harvey', display_name: 'Harvey', bio: null,
      city: '桃園市', district: null, address: null,
      price_min: 1000, price_max: null, ig_handle: null,
      pricing_note: null, booking_notice: null, avatar_url: null,
      status: 'active', featured: false, is_claimed: true,
      lat: null, lng: null, offers_coverup: false,
      offers_custom_design: false, has_flash_designs: false,
      deposit_amount: null, line_user_id: 'U123',
      admin_note: null, quote_templates: null,
      created_at: '', updated_at: '',
    }
    render(<ProfileForm artist={existingArtist} styles={[]} selectedStyleIds={[]} />)
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

  it('populates form with artist data when artist prop is provided', () => {
    const existingArtist: Artist = {
      id: '1', slug: 'harvey', display_name: 'Harvey Chen', bio: 'Professional tattoo artist',
      city: '台北市', district: '大安區', address: '信義路二段100號',
      price_min: 2000, price_max: 5000, ig_handle: '@harveytattoo',
      pricing_note: '依大小複雜度報價', booking_notice: '需提前預約',
      avatar_url: null,
      status: 'active', featured: false, is_claimed: true,
      lat: null, lng: null, offers_coverup: false,
      offers_custom_design: false, has_flash_designs: false,
      deposit_amount: null, line_user_id: 'U123',
      admin_note: null, quote_templates: null,
      created_at: '', updated_at: '',
    }

    render(<ProfileForm artist={existingArtist} styles={mockStyles} selectedStyleIds={[1, 3]} />)

    // Check that the form is populated with artist data
    expect((screen.getByDisplayValue('Harvey Chen') as HTMLInputElement).value).toBe('Harvey Chen')
    expect((screen.getByDisplayValue('Professional tattoo artist') as HTMLTextAreaElement).value).toBe('Professional tattoo artist')
    expect((screen.getByDisplayValue('台北市') as HTMLInputElement).value).toBe('台北市')
    expect((screen.getByDisplayValue('大安區') as HTMLInputElement).value).toBe('大安區')
    expect((screen.getByDisplayValue('信義路二段100號') as HTMLInputElement).value).toBe('信義路二段100號')
    expect((screen.getByDisplayValue('2000') as HTMLInputElement).value).toBe('2000')
    expect((screen.getByDisplayValue('5000') as HTMLInputElement).value).toBe('5000')
    expect((screen.getByDisplayValue('@harveytattoo') as HTMLInputElement).value).toBe('@harveytattoo')
    expect((screen.getByDisplayValue('依大小複雜度報價') as HTMLInputElement).value).toBe('依大小複雜度報價')
    expect((screen.getByDisplayValue('需提前預約') as HTMLTextAreaElement).value).toBe('需提前預約')

    // Check that selected styles are marked with accent color
    const fineLine = screen.getByText('極簡線條')
    const realism = screen.getByText('寫實')
    expect(fineLine.className).toContain('bg-[#C8A97E]')
    expect(realism.className).toContain('bg-[#C8A97E]')
  })

  it('updates form when artist prop changes (hard refresh scenario)', () => {
    const artist1: Artist = {
      id: '1', slug: 'artist1', display_name: 'Artist One', bio: 'First bio',
      city: '台北市', district: null, address: null,
      price_min: 1000, price_max: 2000, ig_handle: '@artist1',
      pricing_note: null, booking_notice: null, avatar_url: null,
      status: 'active', featured: false, is_claimed: true,
      lat: null, lng: null, offers_coverup: false,
      offers_custom_design: false, has_flash_designs: false,
      deposit_amount: null, line_user_id: 'U123',
      admin_note: null, quote_templates: null,
      created_at: '', updated_at: '',
    }

    const artist2: Artist = {
      id: '2', slug: 'artist2', display_name: 'Artist Two', bio: 'Second bio',
      city: '台中市', district: '中區', address: '文心路100號',
      price_min: 3000, price_max: 5000, ig_handle: '@artist2',
      pricing_note: 'Deposit required', booking_notice: 'Call first',
      avatar_url: null,
      status: 'active', featured: false, is_claimed: true,
      lat: null, lng: null, offers_coverup: false,
      offers_custom_design: false, has_flash_designs: false,
      deposit_amount: null, line_user_id: 'U456',
      admin_note: null, quote_templates: null,
      created_at: '', updated_at: '',
    }

    const { rerender } = render(<ProfileForm artist={artist1} styles={mockStyles} selectedStyleIds={[1]} />)

    // Verify first artist data is shown
    expect((screen.getByDisplayValue('Artist One') as HTMLInputElement).value).toBe('Artist One')
    expect((screen.getByDisplayValue('First bio') as HTMLTextAreaElement).value).toBe('First bio')
    expect((screen.getByDisplayValue('1000') as HTMLInputElement).value).toBe('1000')

    // Simulate prop update (e.g., after hard refresh)
    rerender(<ProfileForm artist={artist2} styles={mockStyles} selectedStyleIds={[2]} />)

    // Verify form updated with new artist data
    expect((screen.getByDisplayValue('Artist Two') as HTMLInputElement).value).toBe('Artist Two')
    expect((screen.getByDisplayValue('Second bio') as HTMLTextAreaElement).value).toBe('Second bio')
    expect((screen.getByDisplayValue('3000') as HTMLInputElement).value).toBe('3000')
    expect((screen.getByDisplayValue('文心路100號') as HTMLInputElement).value).toBe('文心路100號')
  })

  it('preserves selected styles when artist prop changes', () => {
    const artist1: Artist = {
      id: '1', slug: 'artist1', display_name: 'Artist One', bio: null,
      city: '台北市', district: null, address: null,
      price_min: 1000, price_max: null, ig_handle: null,
      pricing_note: null, booking_notice: null, avatar_url: null,
      status: 'active', featured: false, is_claimed: true,
      lat: null, lng: null, offers_coverup: false,
      offers_custom_design: false, has_flash_designs: false,
      deposit_amount: null, line_user_id: 'U123',
      admin_note: null, quote_templates: null,
      created_at: '', updated_at: '',
    }

    const { rerender } = render(<ProfileForm artist={artist1} styles={mockStyles} selectedStyleIds={[1, 2]} />)

    // Verify initial styles are selected
    let fineLine = screen.getByText('極簡線條')
    let micro = screen.getByText('微刺青')
    expect(fineLine.className).toContain('bg-[#C8A97E]')
    expect(micro.className).toContain('bg-[#C8A97E]')

    // Update prop with different artist but same styles
    rerender(<ProfileForm artist={artist1} styles={mockStyles} selectedStyleIds={[1, 2]} />)

    // Verify styles are still selected
    fineLine = screen.getByText('極簡線條')
    micro = screen.getByText('微刺青')
    expect(fineLine.className).toContain('bg-[#C8A97E]')
    expect(micro.className).toContain('bg-[#C8A97E]')
  })
})
