import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/i18n/navigation', () => ({ useRouter: vi.fn(() => ({ push: vi.fn() })) }))
vi.mock('next-intl', () => ({ useLocale: () => 'zh-TW' }))
vi.mock('@/hooks/useAuth', () => ({ useAuth: vi.fn() }))
vi.mock('@/lib/analytics', () => ({ trackSubmitInquiry: vi.fn() }))
vi.mock('@/components/inquiry/ReferenceImageUpload', () => ({ ReferenceImageUpload: () => <div data-testid="ref-upload" /> }))
vi.mock('@/components/ui/bottom-drawer', () => ({
  BottomDrawer: ({ children, open }: { children: React.ReactNode; open: boolean }) => open ? <div data-testid="drawer">{children}</div> : null,
  BottomDrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BottomDrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BottomDrawerTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  BottomDrawerDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
}))
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange, name }: { children: React.ReactNode; value?: string; onValueChange?: (value: string) => void; name?: string }) => <select aria-label={name ?? 'body-part'} value={value ?? ''} onChange={(event) => onValueChange?.(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>, SelectValue: () => null,
}))

import { InquiryForm } from '../InquiryForm'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from '@/i18n/navigation'
import { clearInquiryDraft, INQUIRY_DRAFT_TTL_MS, readInquiryDraft, saveInquiryDraft } from '../inquiry-draft'

const auth = vi.mocked(useAuth)
const props = { artistId: 'artist-uuid-1', artistName: '測試刺青師', artistSlug: 'artist', open: true, onOpenChange: vi.fn() }
const loggedIn = () => auth.mockReturnValue({ isLoggedIn: true, isAdmin: false, isLoading: false, user: null, artist: null, loginWithRedirect: vi.fn(), logout: vi.fn(), refetch: vi.fn() })
const guest = () => auth.mockReturnValue({ isLoggedIn: false, isAdmin: false, isLoading: false, user: null, artist: null, loginWithRedirect: vi.fn(), logout: vi.fn(), refetch: vi.fn() })

async function reachReview() {
  await userEvent.type(screen.getByLabelText(/你想刺什麼/), '希望刺一個極簡風格的玫瑰花，放在手腕內側')
  await userEvent.click(screen.getByRole('button', { name: '下一步' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'body-part' }), { target: { value: '手腕' } })
  await userEvent.type(screen.getByLabelText(/大約多大/), '5 x 5 cm')
  fireEvent.change(screen.getByRole('combobox', { name: 'budget_range' }), { target: { value: '8k_20k' } })
  await userEvent.click(screen.getByRole('button', { name: '查看確認內容' }))
}

describe('inquiry drafts', () => {
  beforeEach(() => { sessionStorage.clear() })
  it('restores a valid artist-scoped OAuth draft and removes expired or malformed values', () => {
    saveInquiryDraft('a1', { description: '有效草稿內容超過十個字', body_part: '手腕', size_estimate: '5cm', budget_range: '8k_20k' }, [])
    expect(readInquiryDraft('a1')?.form.body_part).toBe('手腕')
    sessionStorage.setItem('inkhunt:inquiry-draft:a2', JSON.stringify({ savedAt: Date.now() - INQUIRY_DRAFT_TTL_MS - 1, form: {}, referenceImages: [] }))
    expect(readInquiryDraft('a2')).toBeNull()
    expect(sessionStorage.getItem('inkhunt:inquiry-draft:a2')).toBeNull()
    sessionStorage.setItem('inkhunt:inquiry-draft:a3', '{bad')
    expect(readInquiryDraft('a3')).toBeNull()
    clearInquiryDraft('a1')
  })
})

describe('InquiryForm', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); guest(); vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never) })
  it('blocks invalid steps and only renders uploads for signed-in users', async () => {
    loggedIn(); render(<InquiryForm {...props} />)
    expect(screen.getByTestId('ref-upload')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    expect(screen.getByText('請至少描述 10 個字')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/你想刺什麼/), '希望刺一朵玫瑰花在手腕上')
    await userEvent.click(screen.getByRole('button', { name: '下一步' }))
    await userEvent.click(screen.getByRole('button', { name: '查看確認內容' }))
    expect(screen.getByText('請選擇刺青部位')).toBeInTheDocument()
  })
  it('saves a guest draft and returns through OAuth with inquiry=1', async () => {
    const loginWithRedirect = vi.fn(); auth.mockReturnValue({ isLoggedIn: false, isAdmin: false, isLoading: false, user: null, artist: null, loginWithRedirect, logout: vi.fn(), refetch: vi.fn() })
    render(<InquiryForm {...props} />); await reachReview(); await userEvent.click(screen.getByRole('button', { name: 'LINE 登入後免費送出' }))
    expect(loginWithRedirect).toHaveBeenCalledWith(expect.stringContaining('inquiry=1'))
    expect(readInquiryDraft(props.artistId)?.form.description).toContain('玫瑰')
  })
  it('posts once and retains fields when a request fails', async () => {
    loggedIn(); global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: '網路錯誤' }) })
    render(<InquiryForm {...props} />); await reachReview()
    const form = screen.getByTestId('drawer').querySelector('form')!
    fireEvent.submit(form); fireEvent.submit(form)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1))
    expect(await screen.findByText('網路錯誤')).toBeInTheDocument()
    expect(screen.getByText('希望刺一個極簡風格的玫瑰花，放在手腕內側')).toBeInTheDocument()
  })
  it('clears the draft only after a successful POST and sends one budget field', async () => {
    loggedIn(); global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'inq-1' }) })
    const push = vi.fn(); vi.mocked(useRouter).mockReturnValue({ push } as never)
    render(<InquiryForm {...props} />); await reachReview(); await userEvent.click(screen.getByRole('button', { name: '免費送出詢價' }))
    await waitFor(() => expect(push).toHaveBeenCalledWith('/inquiries/inq-1'))
    const payload = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
    expect(payload.budget_range).toBe('8k_20k')
    expect(payload).not.toHaveProperty('budget_min')
    expect(payload).not.toHaveProperty('budget_max')
    expect(readInquiryDraft(props.artistId)).toBeNull()
  })
})
