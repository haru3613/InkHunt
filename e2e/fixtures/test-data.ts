/**
 * E2E test data — self-contained, no imports from src/.
 * Mirrors the mock data structure used by the app's query layer.
 */

// --- Auth Personas ---

export const TEST_CONSUMER = {
  lineUserId: 'U_test_consumer_001',
  displayName: 'Test Consumer',
  avatarUrl: null,
} as const

export const TEST_ARTIST_USER = {
  lineUserId: 'U_test_artist_001',
  displayName: 'Test Artist',
  avatarUrl: 'https://picsum.photos/seed/test-artist/200/200',
} as const

export const TEST_ARTIST_PROFILE = {
  id: 'artist-001',
  slug: 'inkmaster-alex',
  display_name: 'Alex Chen 阿克',
  status: 'active' as const,
} as const

export const TEST_PENDING_ARTIST_PROFILE = {
  id: 'artist-pending',
  slug: 'pending-artist',
  display_name: 'Pending Artist',
  status: 'pending' as const,
} as const

// --- Known artists from mock data (for public page assertions) ---

export const KNOWN_ARTISTS = {
  alex: {
    slug: 'inkmaster-alex',
    displayName: 'Alex Chen 阿克',
    city: '台北市',
    styles: ['寫實', '肖像', '暗黑'],
  },
  sakura: {
    slug: 'sakura-ink',
    displayName: '小櫻 Sakura',
    city: '新北市',
    styles: ['日式傳統', '花卉', '水彩'],
  },
  darkline: {
    slug: 'darkline-studio',
    displayName: 'DarkLine 暗線刺青',
    city: '台北市',
    styles: ['暗黑', '幾何', '點描'],
  },
} as const

// --- Inquiry & Chat fixtures (for client-side API mocking) ---

export const TEST_INQUIRY = {
  id: 'inquiry-001',
  artist_id: 'artist-001',
  consumer_line_id: TEST_CONSUMER.lineUserId,
  consumer_name: TEST_CONSUMER.displayName,
  description: '想刺一個寫實風格的狼頭',
  reference_images: [],
  body_part: '手臂',
  size_estimate: '15x10 cm',
  budget_min: 8000,
  budget_max: 15000,
  status: 'pending',
  created_at: '2026-03-20T10:00:00Z',
} as const

export const TEST_MESSAGES = [
  {
    id: 'msg-001',
    inquiry_id: 'inquiry-001',
    sender_line_id: TEST_CONSUMER.lineUserId,
    sender_type: 'consumer',
    content: '你好，想詢問這個圖案',
    message_type: 'text',
    metadata: null,
    created_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'msg-002',
    inquiry_id: 'inquiry-001',
    sender_line_id: TEST_ARTIST_USER.lineUserId,
    sender_type: 'artist',
    content: '你好！這個圖案可以做，大概需要 2-3 小時',
    message_type: 'text',
    metadata: null,
    created_at: '2026-03-20T10:30:00Z',
  },
] as const

export const TEST_QUOTE = {
  id: 'quote-001',
  inquiry_id: 'inquiry-001',
  artist_id: 'artist-001',
  price: 12000,
  note: '含設計費，15x10cm 寫實風格',
  available_dates: '4/5, 4/12 下午可',
  status: 'sent',
  created_at: '2026-03-20T11:00:00Z',
} as const

// --- API Response shapes ---

export const API_RESPONSES = {
  authPublic: { user: null, artist: null },

  authConsumer: {
    user: { ...TEST_CONSUMER },
    artist: null,
  },

  authArtist: {
    user: { ...TEST_ARTIST_USER },
    artist: { ...TEST_ARTIST_PROFILE },
  },

  authPendingArtist: {
    user: { ...TEST_ARTIST_USER },
    artist: { ...TEST_PENDING_ARTIST_PROFILE },
  },

  authNewUser: {
    user: { ...TEST_ARTIST_USER },
    artist: null,
  },

  inquiryList: [
    {
      ...TEST_INQUIRY,
      artist_display_name: 'Alex Chen 阿克',
      artist_avatar_url: 'https://picsum.photos/seed/alex-avatar/200/200',
      last_message: TEST_MESSAGES[1],
      unread_count: 1,
    },
  ],

  inquiryDetail: {
    ...TEST_INQUIRY,
    artist: {
      id: 'artist-001',
      display_name: 'Alex Chen 阿克',
      avatar_url: 'https://picsum.photos/seed/alex-avatar/200/200',
      slug: 'inkmaster-alex',
    },
    messages: [...TEST_MESSAGES],
    quotes: [TEST_QUOTE],
  },
} as const
