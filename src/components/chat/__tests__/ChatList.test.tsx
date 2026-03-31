import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatList } from '../ChatList'
import type { ChatListItem } from '../ChatList'
import type { Inquiry } from '@/types/database'

// Stub utils so tests are not sensitive to timestamp formatting or initials logic
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
  formatRelativeTime: (_ts: string) => '剛才',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
}))

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inq-1',
    artist_id: 'artist-1',
    consumer_line_id: 'line-user-1',
    consumer_name: '小明',
    description: '想刺一個花臂',
    reference_images: [],
    body_part: '手臂',
    size_estimate: '10cm',
    budget_min: 3000,
    budget_max: 8000,
    status: 'pending',
    quote_request_id: null,
    created_at: '2026-03-29T10:00:00Z',
    ...overrides,
  }
}

function makeItem(overrides: Partial<ChatListItem> = {}): ChatListItem {
  return {
    inquiry: makeInquiry(),
    artist_display_name: '刺青師阿偉',
    artist_avatar_url: null,
    consumer_name: '小明',
    last_message: null,
    last_message_at: null,
    unread_count: 0,
    ...overrides,
  }
}

describe('ChatList', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    onSelect.mockClear()
  })

  it('renders empty state when items array is empty', () => {
    render(
      <ChatList items={[]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('還沒有任何對話')).toBeInTheDocument()
  })

  it('shows consumer name when viewAs is "artist"', () => {
    const item = makeItem({ consumer_name: '消費者小美' })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('消費者小美')).toBeInTheDocument()
    expect(screen.queryByText('刺青師阿偉')).not.toBeInTheDocument()
  })

  it('shows artist display name when viewAs is "consumer"', () => {
    const item = makeItem({ artist_display_name: '刺青師阿偉', consumer_name: '小明' })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="consumer" />,
    )

    expect(screen.getByText('刺青師阿偉')).toBeInTheDocument()
    expect(screen.queryByText('小明')).not.toBeInTheDocument()
  })

  it('falls back to "消費者" when consumer_name is null and viewAs is "artist"', () => {
    const item = makeItem({ consumer_name: null })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('消費者')).toBeInTheDocument()
  })

  it('shows unread indicator when unread_count is greater than zero', () => {
    const item = makeItem({ unread_count: 3 })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByLabelText('未讀訊息')).toBeInTheDocument()
  })

  it('does not show unread indicator when unread_count is zero', () => {
    const item = makeItem({ unread_count: 0 })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.queryByLabelText('未讀訊息')).not.toBeInTheDocument()
  })

  it('shows "待回覆" status badge for pending inquiries', () => {
    const item = makeItem({ inquiry: makeInquiry({ status: 'pending' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('待回覆')).toBeInTheDocument()
  })

  it('shows "已報價" status badge for quoted inquiries', () => {
    const item = makeItem({ inquiry: makeInquiry({ status: 'quoted' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('已報價')).toBeInTheDocument()
  })

  it('shows "已接受" status badge for accepted inquiries', () => {
    const item = makeItem({ inquiry: makeInquiry({ status: 'accepted' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('已接受')).toBeInTheDocument()
  })

  it('shows "已關閉" status badge for closed inquiries', () => {
    const item = makeItem({ inquiry: makeInquiry({ status: 'closed' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    expect(screen.getByText('已關閉')).toBeInTheDocument()
  })

  it('calls onSelect with inquiry id when a list item is clicked', async () => {
    const item = makeItem({ inquiry: makeInquiry({ id: 'inq-42' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    await userEvent.click(screen.getByRole('button'))

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onSelect).toHaveBeenCalledWith('inq-42')
  })

  it('applies selected styling to the active item', () => {
    const item = makeItem({ inquiry: makeInquiry({ id: 'inq-selected' }) })
    render(
      <ChatList items={[item]} selectedId="inq-selected" onSelect={onSelect} viewAs="artist" />,
    )

    const btn = screen.getByRole('button')
    // Selected items get bg-[#1C1C1C] class
    expect(btn.className).toContain('bg-[#1C1C1C]')
  })

  it('does not apply selected styling when item is not selected', () => {
    const item = makeItem({ inquiry: makeInquiry({ id: 'inq-1' }) })
    render(
      <ChatList items={[item]} selectedId="inq-other" onSelect={onSelect} viewAs="artist" />,
    )

    const btn = screen.getByRole('button')
    expect(btn.className).not.toContain('bg-[#1C1C1C]')
  })

  it('applies opacity-50 class to closed items', () => {
    const item = makeItem({ inquiry: makeInquiry({ status: 'closed' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    const btn = screen.getByRole('button')
    expect(btn.className).toContain('opacity-50')
  })

  it('does not apply opacity-50 to non-closed items', () => {
    const item = makeItem({ inquiry: makeInquiry({ status: 'pending' }) })
    render(
      <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    const btn = screen.getByRole('button')
    expect(btn.className).not.toContain('opacity-50')
  })

  it('renders multiple items in order', () => {
    const items = [
      makeItem({ inquiry: makeInquiry({ id: 'inq-a' }), consumer_name: '使用者A' }),
      makeItem({ inquiry: makeInquiry({ id: 'inq-b' }), consumer_name: '使用者B' }),
    ]
    render(
      <ChatList items={items} selectedId={null} onSelect={onSelect} viewAs="artist" />,
    )

    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(2)
    expect(screen.getByText('使用者A')).toBeInTheDocument()
    expect(screen.getByText('使用者B')).toBeInTheDocument()
  })
})
