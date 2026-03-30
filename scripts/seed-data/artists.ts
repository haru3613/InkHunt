/**
 * Artist profiles and style associations for staging seed data.
 * 7 artists: 3 active, 2 pending, 1 suspended, 1 admin-artist
 */

import { USER_IDS } from './users'

// Deterministic artist UUIDs
export const ARTIST_IDS = {
  INKED_WOLF: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa001',
  SAKURA_INK: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa002',
  SHADOW_LINE: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa003',
  NEW_TALENT: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa004',
  BARE_BONES: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa005',
  SUSPENDED: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa006',
  HARVEY: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaa007',
} as const

export interface SeedArtist {
  id: string
  slug: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  ig_handle: string | null
  line_user_id: string
  city: string
  district: string | null
  price_min: number | null
  price_max: number | null
  pricing_note: string | null
  booking_notice: string | null
  status: 'pending' | 'active' | 'suspended'
  is_claimed: boolean
  featured: boolean
  offers_coverup: boolean
  offers_custom_design: boolean
  has_flash_designs: boolean
  quote_templates: object[]
}

export const SEED_ARTISTS: SeedArtist[] = [
  // --- Active Artists ---
  {
    id: ARTIST_IDS.INKED_WOLF,
    slug: 'inked-wolf',
    display_name: 'InkedWolf 刺青',
    bio: '專精寫實風格超過 8 年經驗，擅長黑灰寫實與肖像刺青。每件作品都是獨一無二的藝術品。',
    avatar_url: 'https://picsum.photos/seed/wolf-avatar/200/200',
    ig_handle: 'inkedwolf_tattoo',
    line_user_id: 'artist-inked-wolf',
    city: '台北市',
    district: '大安區',
    price_min: 3000,
    price_max: 15000,
    pricing_note: '依圖案大小與複雜度報價，歡迎帶圖討論',
    booking_notice: '目前預約需等 2-3 週',
    status: 'active',
    is_claimed: true,
    featured: true,
    offers_coverup: true,
    offers_custom_design: true,
    has_flash_designs: false,
    quote_templates: [
      { label: '小圖 (5cm以下)', price: 3000, note: '含設計費' },
      { label: '中圖 (10-15cm)', price: 8000, note: '含設計費，約 3-4 小時' },
      { label: '大圖 (半袖/半甲)', price: 15000, note: '分次施作，含設計費' },
    ],
  },
  {
    id: ARTIST_IDS.SAKURA_INK,
    slug: 'sakura-ink',
    display_name: 'Sakura Ink 櫻花刺青',
    bio: '日式傳統與新傳統風格，融合東方美學與現代技法。作品以花卉與和風圖案為主。',
    avatar_url: 'https://picsum.photos/seed/sakura-avatar/200/200',
    ig_handle: 'sakura_ink_tw',
    line_user_id: 'artist-sakura-ink',
    city: '台中市',
    district: '西區',
    price_min: 2500,
    price_max: 12000,
    pricing_note: '日式風格依面積計價',
    booking_notice: '週末預約較滿，建議平日',
    status: 'active',
    is_claimed: true,
    featured: true,
    offers_coverup: false,
    offers_custom_design: true,
    has_flash_designs: true,
    quote_templates: [
      { label: '極簡小圖', price: 2500, note: '線條簡潔風格' },
      { label: '花卉中圖', price: 7000, note: '含上色，約 3 小時' },
    ],
  },
  {
    id: ARTIST_IDS.SHADOW_LINE,
    slug: 'shadow-line',
    display_name: 'Shadow Line 暗線刺青',
    bio: '暗黑風格與幾何圖騰，擅長點描與黑工。低調但充滿力量的作品風格。',
    avatar_url: 'https://picsum.photos/seed/shadow-avatar/200/200',
    ig_handle: 'shadowline_tattoo',
    line_user_id: 'artist-shadow-line',
    city: '高雄市',
    district: '前鎮區',
    price_min: 2000,
    price_max: 10000,
    pricing_note: '點描作品按時計費 $2000/hr',
    booking_notice: '可接急件',
    status: 'active',
    is_claimed: true,
    featured: false,
    offers_coverup: true,
    offers_custom_design: true,
    has_flash_designs: true,
    quote_templates: [
      { label: '幾何小圖', price: 2000, note: '簡單幾何圖形' },
      { label: '點描中圖', price: 6000, note: '按時計費約 3hr' },
      { label: '暗黑大圖', price: 10000, note: '黑工大面積，分次施作' },
    ],
  },
  // --- Pending Artists ---
  {
    id: ARTIST_IDS.NEW_TALENT,
    slug: 'new-talent',
    display_name: 'New Talent 新手刺青師',
    bio: '熱愛插畫風格，從平面設計轉職刺青師。作品充滿活力與創意。',
    avatar_url: 'https://picsum.photos/seed/talent-avatar/200/200',
    ig_handle: 'newtalent_ink',
    line_user_id: 'artist-new-talent',
    city: '台北市',
    district: '中山區',
    price_min: 1500,
    price_max: 8000,
    pricing_note: '新人優惠中',
    booking_notice: null,
    status: 'pending',
    is_claimed: true,
    featured: false,
    offers_coverup: false,
    offers_custom_design: true,
    has_flash_designs: false,
    quote_templates: [],
  },
  {
    id: ARTIST_IDS.BARE_BONES,
    slug: 'bare-bones',
    display_name: 'Bare Bones 素描刺青',
    bio: null, // incomplete profile
    avatar_url: null,
    ig_handle: null,
    line_user_id: 'artist-bare-bones',
    city: '新北市',
    district: null,
    price_min: null,
    price_max: null,
    pricing_note: null,
    booking_notice: null,
    status: 'pending',
    is_claimed: true,
    featured: false,
    offers_coverup: false,
    offers_custom_design: false,
    has_flash_designs: false,
    quote_templates: [],
  },
  // --- Suspended ---
  {
    id: ARTIST_IDS.SUSPENDED,
    slug: 'suspended-tattooist',
    display_name: 'Suspended Tattooist',
    bio: '違規帳號，已被停權。',
    avatar_url: null,
    ig_handle: 'sus_tattoo',
    line_user_id: 'artist-suspended-01',
    city: '台北市',
    district: '信義區',
    price_min: 5000,
    price_max: 20000,
    pricing_note: null,
    booking_notice: null,
    status: 'suspended',
    is_claimed: true,
    featured: false,
    offers_coverup: false,
    offers_custom_design: false,
    has_flash_designs: false,
    quote_templates: [],
  },
  // --- Admin Artist ---
  {
    id: ARTIST_IDS.HARVEY,
    slug: 'harvey-admin',
    display_name: 'Harvey (Admin)',
    bio: '平台管理員兼刺青師，測試用帳號。',
    avatar_url: 'https://picsum.photos/seed/harvey-avatar/200/200',
    ig_handle: 'harvey_inkhunt',
    line_user_id: 'U770e3788b27c6cdeb9248b9f7139f171',
    city: '台北市',
    district: '松山區',
    price_min: 2000,
    price_max: 10000,
    pricing_note: '測試用',
    booking_notice: null,
    status: 'active',
    is_claimed: true,
    featured: false,
    offers_coverup: false,
    offers_custom_design: true,
    has_flash_designs: false,
    quote_templates: [
      { label: '測試報價', price: 3000, note: '管理員測試用' },
    ],
  },
]

// Style slug → artist IDs mapping
// Style slugs must match seed.sql
export const ARTIST_STYLE_MAP: Record<string, string[]> = {
  realism: [ARTIST_IDS.INKED_WOLF],
  portrait: [ARTIST_IDS.INKED_WOLF],
  blackwork: [ARTIST_IDS.INKED_WOLF, ARTIST_IDS.SHADOW_LINE],
  'japanese-traditional': [ARTIST_IDS.SAKURA_INK],
  'neo-traditional': [ARTIST_IDS.SAKURA_INK],
  floral: [ARTIST_IDS.SAKURA_INK],
  geometric: [ARTIST_IDS.SHADOW_LINE],
  dotwork: [ARTIST_IDS.SHADOW_LINE],
  tribal: [ARTIST_IDS.SHADOW_LINE],
  illustrative: [ARTIST_IDS.NEW_TALENT, ARTIST_IDS.HARVEY],
  'fine-line': [ARTIST_IDS.NEW_TALENT],
  watercolor: [ARTIST_IDS.HARVEY],
}
