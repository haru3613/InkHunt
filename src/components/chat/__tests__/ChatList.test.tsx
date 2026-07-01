import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatList } from '../ChatList'
import type { ChatListItem } from '../ChatList'
import type { Inquiry } from '@/types/database'
import zhTW from '../../../../messages/zh-TW.json'
import en from '../../../../messages/en.json'

// Stub utils so tests are not sensitive to timestamp formatting or initials logic.
// Keep `cn` a real join so we can assert the STATUS_CONFIG color className.
vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' '),
  formatRelativeTime: () => '剛才',
  getInitials: (name: string) => name.slice(0, 2).toUpperCase(),
}))

// Resolve the pill label from the REAL messages files so the test proves the
// label comes from Slice A's `inquiry.status.*` keys (not a hardcoded string).
// `setLocaleMessages` picks the active locale before each render.
let localeMessages: typeof zhTW = zhTW
function setLocaleMessages(messages: typeof zhTW) {
  localeMessages = messages
}
vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) => {
    const scope = namespace
      .split('.')
      .reduce<Record<string, unknown>>(
        (acc, part) => (acc?.[part] as Record<string, unknown>) ?? {},
        localeMessages as unknown as Record<string, unknown>,
      )
    return (scope as Record<string, string>)[key] ?? `${namespace}.${key}`
  },
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
    setLocaleMessages(zhTW)
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

  // Per-status pill: label comes from the i18n `inquiry.status.*` key, color
  // stays in the shared STATUS_CONFIG map. `colorClass` mirrors STATUS_CONFIG
  // in ChatList.tsx — if the color source is forked/removed, this fails.
  const STATUS_CASES: {
    status: Inquiry['status']
    zhLabel: string
    enLabel: string
    colorClass: string
  }[] = [
    { status: 'pending', zhLabel: '待回覆', enLabel: 'Awaiting reply', colorClass: 'bg-[#C8A97E]' },
    { status: 'quoted', zhLabel: '已報價', enLabel: 'Quoted', colorClass: 'text-[#8A8A8A]' },
    { status: 'accepted', zhLabel: '已接受', enLabel: 'Accepted', colorClass: 'text-[#4ADE80]' },
    { status: 'closed', zhLabel: '已關閉', enLabel: 'Closed', colorClass: 'text-[#555555]' },
  ]

  for (const { status, zhLabel, enLabel, colorClass } of STATUS_CASES) {
    it(`renders the localized zh-TW pill label for ${status} inquiries`, () => {
      // zh-TW value must equal the current pill (no visual regression on /zh-TW)
      expect(zhTW.inquiry.status[status]).toBe(zhLabel)

      const item = makeItem({ inquiry: makeInquiry({ status }) })
      render(
        <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
      )

      const pill = screen.getByText(zhLabel)
      expect(pill).toBeInTheDocument()
      // Label is driven by i18n, not the hardcoded STATUS_CONFIG.label field
      expect(pill.textContent).toBe(zhTW.inquiry.status[status])
      // Color still comes from the shared STATUS_CONFIG map
      expect(pill.className).toContain(colorClass)
    })

    it(`renders the localized /en pill label for ${status} inquiries`, () => {
      setLocaleMessages(en)
      const item = makeItem({ inquiry: makeInquiry({ status }) })
      render(
        <ChatList items={[item]} selectedId={null} onSelect={onSelect} viewAs="artist" />,
      )

      // On /en the pill shows the English label, NOT the Chinese one
      const pill = screen.getByText(enLabel)
      expect(pill).toBeInTheDocument()
      expect(screen.queryByText(zhLabel)).not.toBeInTheDocument()
      // Color is locale-independent (still from STATUS_CONFIG)
      expect(pill.className).toContain(colorClass)
    })
  }

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
