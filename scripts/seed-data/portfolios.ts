/**
 * Portfolio items for staging seed data.
 * Uses picsum.photos with deterministic seeds for consistent placeholder images.
 */

import { ARTIST_IDS } from './artists'

export interface SeedPortfolioItem {
  id: string
  artist_id: string
  image_url: string
  thumbnail_url: string
  title: string
  description: string | null
  body_part: string | null
  sort_order: number
}

// Deterministic UUIDs for portfolio items
const pid = (n: number) => `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbb${String(n).padStart(3, '0')}`

const picsum = (seed: string, w = 800, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`

export const SEED_PORTFOLIO_ITEMS: SeedPortfolioItem[] = [
  // --- InkedWolf (8 items) ---
  {
    id: pid(1),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-1'),
    thumbnail_url: picsum('wolf-1', 400, 300),
    title: '黑灰寫實獅子',
    description: '前臂寫實風格，約 6 小時完成',
    body_part: '前臂',
    sort_order: 1,
  },
  {
    id: pid(2),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-2'),
    thumbnail_url: picsum('wolf-2', 400, 300),
    title: '肖像刺青',
    description: '寫實人像，客戶紀念作品',
    body_part: '上臂',
    sort_order: 2,
  },
  {
    id: pid(3),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-3'),
    thumbnail_url: picsum('wolf-3', 400, 300),
    title: '玫瑰寫實',
    description: null,
    body_part: '手背',
    sort_order: 3,
  },
  {
    id: pid(4),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-4'),
    thumbnail_url: picsum('wolf-4', 400, 300),
    title: '老虎半甲',
    description: '傳統寫實風格，分三次完成',
    body_part: '背部',
    sort_order: 4,
  },
  {
    id: pid(5),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-5'),
    thumbnail_url: picsum('wolf-5', 400, 300),
    title: '骷髏遮蓋作品',
    description: '遮蓋舊刺青，改為骷髏寫實',
    body_part: '小腿',
    sort_order: 5,
  },
  {
    id: pid(6),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-6'),
    thumbnail_url: picsum('wolf-6', 400, 300),
    title: '鷹眼特寫',
    description: null,
    body_part: '胸口',
    sort_order: 6,
  },
  {
    id: pid(7),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-7'),
    thumbnail_url: picsum('wolf-7', 400, 300),
    title: '蛇繞手臂',
    description: '環繞式設計',
    body_part: '前臂',
    sort_order: 7,
  },
  {
    id: pid(8),
    artist_id: ARTIST_IDS.INKED_WOLF,
    image_url: picsum('wolf-8'),
    thumbnail_url: picsum('wolf-8', 400, 300),
    title: '鯉魚半袖',
    description: '混合寫實與日式',
    body_part: '上臂',
    sort_order: 8,
  },

  // --- Sakura Ink (6 items) ---
  {
    id: pid(9),
    artist_id: ARTIST_IDS.SAKURA_INK,
    image_url: picsum('sakura-1'),
    thumbnail_url: picsum('sakura-1', 400, 300),
    title: '櫻花半袖',
    description: '日式傳統風格，粉色漸層',
    body_part: '上臂',
    sort_order: 1,
  },
  {
    id: pid(10),
    artist_id: ARTIST_IDS.SAKURA_INK,
    image_url: picsum('sakura-2'),
    thumbnail_url: picsum('sakura-2', 400, 300),
    title: '牡丹花',
    description: '新傳統牡丹，鮮豔配色',
    body_part: '大腿',
    sort_order: 2,
  },
  {
    id: pid(11),
    artist_id: ARTIST_IDS.SAKURA_INK,
    image_url: picsum('sakura-3'),
    thumbnail_url: picsum('sakura-3', 400, 300),
    title: '錦鯉',
    description: '日式傳統錦鯉，紅白配色',
    body_part: '背部',
    sort_order: 3,
  },
  {
    id: pid(12),
    artist_id: ARTIST_IDS.SAKURA_INK,
    image_url: picsum('sakura-4'),
    thumbnail_url: picsum('sakura-4', 400, 300),
    title: '般若面具',
    description: null,
    body_part: '小腿',
    sort_order: 4,
  },
  {
    id: pid(13),
    artist_id: ARTIST_IDS.SAKURA_INK,
    image_url: picsum('sakura-5'),
    thumbnail_url: picsum('sakura-5', 400, 300),
    title: '蓮花極簡',
    description: '細線條蓮花',
    body_part: '手腕',
    sort_order: 5,
  },
  {
    id: pid(14),
    artist_id: ARTIST_IDS.SAKURA_INK,
    image_url: picsum('sakura-6'),
    thumbnail_url: picsum('sakura-6', 400, 300),
    title: '龍與雲',
    description: '傳統龍紋，大面積作品',
    body_part: '背部',
    sort_order: 6,
  },

  // --- Shadow Line (6 items) ---
  {
    id: pid(15),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    image_url: picsum('shadow-1'),
    thumbnail_url: picsum('shadow-1', 400, 300),
    title: '幾何曼陀羅',
    description: '精密幾何圖案，對稱設計',
    body_part: '前臂',
    sort_order: 1,
  },
  {
    id: pid(16),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    image_url: picsum('shadow-2'),
    thumbnail_url: picsum('shadow-2', 400, 300),
    title: '點描骷髏',
    description: '純點描技法，約 5 小時',
    body_part: '上臂',
    sort_order: 2,
  },
  {
    id: pid(17),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    image_url: picsum('shadow-3'),
    thumbnail_url: picsum('shadow-3', 400, 300),
    title: '部落圖騰',
    description: '現代部落風格',
    body_part: '小腿',
    sort_order: 3,
  },
  {
    id: pid(18),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    image_url: picsum('shadow-4'),
    thumbnail_url: picsum('shadow-4', 400, 300),
    title: '黑工手環',
    description: '環繞式黑工',
    body_part: '手腕',
    sort_order: 4,
  },
  {
    id: pid(19),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    image_url: picsum('shadow-5'),
    thumbnail_url: picsum('shadow-5', 400, 300),
    title: '幾何動物',
    description: '幾何風格狼頭',
    body_part: '胸口',
    sort_order: 5,
  },
  {
    id: pid(20),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    image_url: picsum('shadow-6'),
    thumbnail_url: picsum('shadow-6', 400, 300),
    title: '暗黑花紋',
    description: '大面積暗黑風格',
    body_part: '大腿',
    sort_order: 6,
  },

  // --- New Talent (3 items - pending artist) ---
  {
    id: pid(21),
    artist_id: ARTIST_IDS.NEW_TALENT,
    image_url: picsum('talent-1'),
    thumbnail_url: picsum('talent-1', 400, 300),
    title: '插畫風貓咪',
    description: '可愛插畫風格',
    body_part: '手腕',
    sort_order: 1,
  },
  {
    id: pid(22),
    artist_id: ARTIST_IDS.NEW_TALENT,
    image_url: picsum('talent-2'),
    thumbnail_url: picsum('talent-2', 400, 300),
    title: '線條植物',
    description: '極簡線條風格',
    body_part: '腳踝',
    sort_order: 2,
  },
  {
    id: pid(23),
    artist_id: ARTIST_IDS.NEW_TALENT,
    image_url: picsum('talent-3'),
    thumbnail_url: picsum('talent-3', 400, 300),
    title: '手繪星座',
    description: null,
    body_part: '鎖骨',
    sort_order: 3,
  },

  // --- Harvey (2 items) ---
  {
    id: pid(24),
    artist_id: ARTIST_IDS.HARVEY,
    image_url: picsum('harvey-1'),
    thumbnail_url: picsum('harvey-1', 400, 300),
    title: '水彩蝴蝶',
    description: '測試作品',
    body_part: '背部',
    sort_order: 1,
  },
  {
    id: pid(25),
    artist_id: ARTIST_IDS.HARVEY,
    image_url: picsum('harvey-2'),
    thumbnail_url: picsum('harvey-2', 400, 300),
    title: '插畫風格鯨魚',
    description: '管理員測試作品',
    body_part: '前臂',
    sort_order: 2,
  },
]
