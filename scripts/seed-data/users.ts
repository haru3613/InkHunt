/**
 * Test user definitions for staging environment.
 * Each user has a deterministic UUID and LINE user ID for cross-referencing.
 *
 * Password derivation must match /api/auth/dev-login:
 *   HMAC-SHA256(SERVICE_ROLE_KEY, lineUserId)
 */

export interface TestUser {
  id: string
  lineUserId: string
  displayName: string
  role: 'consumer' | 'artist' | 'admin'
  description: string
}

// Deterministic UUIDs for FK references
export const USER_IDS = {
  CONSUMER_XIAOMING: '11111111-1111-1111-1111-111111111001',
  CONSUMER_XIAOMEI: '11111111-1111-1111-1111-111111111002',
  CONSUMER_AWEI: '11111111-1111-1111-1111-111111111003',
  ARTIST_INKED_WOLF: '22222222-2222-2222-2222-222222222001',
  ARTIST_SAKURA_INK: '22222222-2222-2222-2222-222222222002',
  ARTIST_SHADOW_LINE: '22222222-2222-2222-2222-222222222003',
  ARTIST_NEW_TALENT: '22222222-2222-2222-2222-222222222004',
  ARTIST_BARE_BONES: '22222222-2222-2222-2222-222222222005',
  ARTIST_SUSPENDED: '22222222-2222-2222-2222-222222222006',
  ADMIN_HARVEY: '33333333-3333-3333-3333-333333333001',
} as const

export const TEST_USERS: TestUser[] = [
  // Consumers
  {
    id: USER_IDS.CONSUMER_XIAOMING,
    lineUserId: 'consumer-001',
    displayName: '小明',
    role: 'consumer',
    description: 'Journey 2: has existing inquiries in various statuses',
  },
  {
    id: USER_IDS.CONSUMER_XIAOMEI,
    lineUserId: 'consumer-002',
    displayName: '小美',
    role: 'consumer',
    description: 'Journey 1: fresh consumer, no history',
  },
  {
    id: USER_IDS.CONSUMER_AWEI,
    lineUserId: 'consumer-003',
    displayName: '阿偉',
    role: 'consumer',
    description: 'Journey 3: has multi-artist quote requests',
  },
  // Artists
  {
    id: USER_IDS.ARTIST_INKED_WOLF,
    lineUserId: 'artist-inked-wolf',
    displayName: 'InkedWolf 刺青',
    role: 'artist',
    description: 'Journey 5: active artist, complete profile, has inquiries',
  },
  {
    id: USER_IDS.ARTIST_SAKURA_INK,
    lineUserId: 'artist-sakura-ink',
    displayName: 'Sakura Ink 櫻花刺青',
    role: 'artist',
    description: 'Journey 1,3: active artist, different city',
  },
  {
    id: USER_IDS.ARTIST_SHADOW_LINE,
    lineUserId: 'artist-shadow-line',
    displayName: 'Shadow Line 暗線刺青',
    role: 'artist',
    description: 'Journey 1,3: active artist, different style',
  },
  {
    id: USER_IDS.ARTIST_NEW_TALENT,
    lineUserId: 'artist-new-talent',
    displayName: 'New Talent 新手刺青師',
    role: 'artist',
    description: 'Journey 4: pending artist, complete profile',
  },
  {
    id: USER_IDS.ARTIST_BARE_BONES,
    lineUserId: 'artist-bare-bones',
    displayName: 'Bare Bones 素描刺青',
    role: 'artist',
    description: 'Journey 4: pending artist, incomplete profile',
  },
  {
    id: USER_IDS.ARTIST_SUSPENDED,
    lineUserId: 'artist-suspended-01',
    displayName: 'Suspended Tattooist',
    role: 'artist',
    description: 'Journey 6: suspended artist for admin testing',
  },
  // Admin
  {
    id: USER_IDS.ADMIN_HARVEY,
    lineUserId: 'U770e3788b27c6cdeb9248b9f7139f171',
    displayName: 'Harvey',
    role: 'admin',
    description: 'Journey 6: admin + artist',
  },
]
