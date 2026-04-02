/**
 * Inquiries, quotes, messages, and quote requests for staging seed data.
 * Covers all status combinations for the 6 user journeys.
 */

import { ARTIST_IDS } from './artists'

// Deterministic UUIDs
const iid = (n: number) => `cccccccc-cccc-cccc-cccc-ccccccccc${String(n).padStart(3, '0')}`
const qid = (n: number) => `dddddddd-dddd-dddd-dddd-ddddddddd${String(n).padStart(3, '0')}`
const mid = (n: number) => `eeeeeeee-eeee-eeee-eeee-eeeeeeeee${String(n).padStart(3, '0')}`
const qrid = (n: number) => `ffffffff-ffff-ffff-ffff-fffffffffff${String(n).padStart(1, '0')}`

// --- Quote Requests (Journey 3: 阿偉) ---
export const SEED_QUOTE_REQUESTS = [
  {
    id: qrid(1),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    description: '想要一個日式風格的鯉魚刺青，大概在背部，預算 8000-15000',
    reference_images: '[]',
    body_part: '背部',
    size_estimate: '約 20cm x 15cm',
    budget_min: 8000,
    budget_max: 15000,
    status: 'quoting',
  },
  {
    id: qrid(2),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    description: '想要幾何風格的手環刺青',
    reference_images: '[]',
    body_part: '手腕',
    size_estimate: '環繞手腕一圈',
    budget_min: 2000,
    budget_max: 5000,
    status: 'pending',
  },
]

// --- Inquiries ---
export const SEED_INQUIRIES = [
  // Journey 2: 小明's inquiries (various statuses)
  // #1: pending - just sent, artist hasn't responded
  {
    id: iid(1),
    consumer_line_id: 'consumer-001',
    consumer_name: '小明',
    artist_id: ARTIST_IDS.INKED_WOLF,
    description: '想刺一個寫實風格的狼頭，大約在前臂內側',
    reference_images: '[]',
    body_part: '前臂',
    size_estimate: '約 10cm',
    budget_min: 5000,
    budget_max: 10000,
    status: 'pending',
    quote_request_id: null,
  },
  // #2: quoted - artist sent quote, waiting for consumer
  {
    id: iid(2),
    consumer_line_id: 'consumer-001',
    consumer_name: '小明',
    artist_id: ARTIST_IDS.SAKURA_INK,
    description: '想要一朵櫻花在手腕上，極簡風格',
    reference_images: '[]',
    body_part: '手腕',
    size_estimate: '約 5cm',
    budget_min: 2000,
    budget_max: 5000,
    status: 'quoted',
    quote_request_id: null,
  },
  // #3: accepted - consumer accepted quote
  {
    id: iid(3),
    consumer_line_id: 'consumer-001',
    consumer_name: '小明',
    artist_id: ARTIST_IDS.SHADOW_LINE,
    description: '幾何風格的曼陀羅，上臂外側',
    reference_images: '[]',
    body_part: '上臂',
    size_estimate: '約 12cm',
    budget_min: 4000,
    budget_max: 8000,
    status: 'accepted',
    quote_request_id: null,
  },
  // #4: closed - completed inquiry
  {
    id: iid(4),
    consumer_line_id: 'consumer-001',
    consumer_name: '小明',
    artist_id: ARTIST_IDS.INKED_WOLF,
    description: '之前做的小圖，已完成',
    reference_images: '[]',
    body_part: '腳踝',
    size_estimate: '約 3cm',
    budget_min: 2000,
    budget_max: 3000,
    status: 'closed',
    quote_request_id: null,
  },

  // Journey 3: 阿偉's quote request inquiries
  // #5: quoted (from quote request 1 - to InkedWolf)
  {
    id: iid(5),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    artist_id: ARTIST_IDS.INKED_WOLF,
    description: '想要一個日式風格的鯉魚刺青，大概在背部，預算 8000-15000',
    reference_images: '[]',
    body_part: '背部',
    size_estimate: '約 20cm x 15cm',
    budget_min: 8000,
    budget_max: 15000,
    status: 'quoted',
    quote_request_id: qrid(1),
  },
  // #6: quoted (from quote request 1 - to Sakura)
  {
    id: iid(6),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    artist_id: ARTIST_IDS.SAKURA_INK,
    description: '想要一個日式風格的鯉魚刺青，大概在背部，預算 8000-15000',
    reference_images: '[]',
    body_part: '背部',
    size_estimate: '約 20cm x 15cm',
    budget_min: 8000,
    budget_max: 15000,
    status: 'quoted',
    quote_request_id: qrid(1),
  },
  // #7: pending (from quote request 1 - to ShadowLine, hasn't responded yet)
  {
    id: iid(7),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    artist_id: ARTIST_IDS.SHADOW_LINE,
    description: '想要一個日式風格的鯉魚刺青，大概在背部，預算 8000-15000',
    reference_images: '[]',
    body_part: '背部',
    size_estimate: '約 20cm x 15cm',
    budget_min: 8000,
    budget_max: 15000,
    status: 'pending',
    quote_request_id: qrid(1),
  },

  // Journey 5: more inquiries to InkedWolf for dashboard stats
  // #8: pending from another consumer
  {
    id: iid(8),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    artist_id: ARTIST_IDS.INKED_WOLF,
    description: '想要幾何風格的手環刺青',
    reference_images: '[]',
    body_part: '手腕',
    size_estimate: '環繞手腕一圈',
    budget_min: 2000,
    budget_max: 5000,
    status: 'pending',
    quote_request_id: qrid(2),
  },

  // #9: quoted inquiry to Sakura from 小明
  {
    id: iid(9),
    consumer_line_id: 'consumer-001',
    consumer_name: '小明',
    artist_id: ARTIST_IDS.SAKURA_INK,
    description: '想要背部大面積的龍紋',
    reference_images: '[]',
    body_part: '背部',
    size_estimate: '約 30cm x 20cm',
    budget_min: 10000,
    budget_max: 20000,
    status: 'quoted',
    quote_request_id: null,
  },

  // #10: pending to Harvey (admin artist)
  {
    id: iid(10),
    consumer_line_id: 'consumer-002',
    consumer_name: '小美',
    artist_id: ARTIST_IDS.HARVEY,
    description: '想要一個小水彩風格的蝴蝶',
    reference_images: '[]',
    body_part: '鎖骨',
    size_estimate: '約 5cm',
    budget_min: 2000,
    budget_max: 4000,
    status: 'pending',
    quote_request_id: null,
  },

  // #11: closed inquiry for ShadowLine
  {
    id: iid(11),
    consumer_line_id: 'consumer-001',
    consumer_name: '小明',
    artist_id: ARTIST_IDS.SHADOW_LINE,
    description: '之前詢問的部落圖騰，已決定不做了',
    reference_images: '[]',
    body_part: '小腿',
    size_estimate: '約 15cm',
    budget_min: 3000,
    budget_max: 6000,
    status: 'closed',
    quote_request_id: null,
  },

  // #12: accepted inquiry for Sakura
  {
    id: iid(12),
    consumer_line_id: 'consumer-003',
    consumer_name: '阿偉',
    artist_id: ARTIST_IDS.SAKURA_INK,
    description: '蓮花極簡風格，已確認預約',
    reference_images: '[]',
    body_part: '手腕',
    size_estimate: '約 4cm',
    budget_min: 2000,
    budget_max: 3000,
    status: 'accepted',
    quote_request_id: null,
  },
]

// --- Quotes ---
export const SEED_QUOTES = [
  // Quote for inquiry #2 (小明 → Sakura, status: quoted)
  {
    id: qid(1),
    inquiry_id: iid(2),
    artist_id: ARTIST_IDS.SAKURA_INK,
    price: 3000,
    note: '極簡櫻花很適合手腕，預計 1.5 小時',
    available_dates: '下週三,下週五',
    status: 'sent',
  },
  // Quote for inquiry #3 (小明 → ShadowLine, accepted)
  {
    id: qid(2),
    inquiry_id: iid(3),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    price: 6000,
    note: '幾何曼陀羅需要約 3 小時，建議一次完成',
    available_dates: '週六,週日',
    status: 'accepted',
  },
  // Quote for inquiry #4 (closed, was accepted before close)
  {
    id: qid(3),
    inquiry_id: iid(4),
    artist_id: ARTIST_IDS.INKED_WOLF,
    price: 2500,
    note: '小圖快速完成',
    available_dates: '隨時',
    status: 'accepted',
  },
  // Quotes for quote request inquiries
  // InkedWolf quoted for inquiry #5
  {
    id: qid(4),
    inquiry_id: iid(5),
    artist_id: ARTIST_IDS.INKED_WOLF,
    price: 12000,
    note: '寫實鯉魚需要分兩次施作，每次約 4 小時',
    available_dates: '下週六第一次,兩週後第二次',
    status: 'sent',
  },
  // Sakura quoted for inquiry #6
  {
    id: qid(5),
    inquiry_id: iid(6),
    artist_id: ARTIST_IDS.SAKURA_INK,
    price: 10000,
    note: '日式傳統鯉魚是我的專長！可以一次完成',
    available_dates: '這週末,下週三',
    status: 'sent',
  },
  // Quote for inquiry #9 (小明 → Sakura)
  {
    id: qid(6),
    inquiry_id: iid(9),
    artist_id: ARTIST_IDS.SAKURA_INK,
    price: 18000,
    note: '大面積龍紋需要分三次施作',
    available_dates: '需要面議時程',
    status: 'viewed',
  },
  // Quote for inquiry #12 (阿偉 → Sakura, accepted)
  {
    id: qid(7),
    inquiry_id: iid(12),
    artist_id: ARTIST_IDS.SAKURA_INK,
    price: 2500,
    note: '極簡蓮花，1 小時完成',
    available_dates: '下週一',
    status: 'accepted',
  },
  // Rejected quote example
  {
    id: qid(8),
    inquiry_id: iid(11),
    artist_id: ARTIST_IDS.SHADOW_LINE,
    price: 5000,
    note: '部落圖騰中圖',
    available_dates: '週末',
    status: 'rejected',
  },
]

// --- Messages ---
export const SEED_MESSAGES = [
  // Inquiry #1 (pending - just system message)
  {
    id: mid(1),
    inquiry_id: iid(1),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小明 向 InkedWolf 刺青 發送了詢價',
    metadata: null,
  },

  // Inquiry #2 (quoted - system + consumer + quote)
  {
    id: mid(2),
    inquiry_id: iid(2),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小明 向 Sakura Ink 櫻花刺青 發送了詢價',
    metadata: null,
  },
  {
    id: mid(3),
    inquiry_id: iid(2),
    sender_type: 'consumer',
    sender_id: 'consumer-001',
    message_type: 'text',
    content: '你好！我想要一朵簡單的櫻花在手腕上，可以幫我報價嗎？',
    metadata: null,
  },
  {
    id: mid(4),
    inquiry_id: iid(2),
    sender_type: 'artist',
    sender_id: 'artist-sakura-ink',
    message_type: 'text',
    content: '你好！櫻花是我很擅長的主題，我幫你報個價',
    metadata: null,
  },
  {
    id: mid(5),
    inquiry_id: iid(2),
    sender_type: 'artist',
    sender_id: 'artist-sakura-ink',
    message_type: 'quote',
    content: '報價：$3,000',
    metadata: JSON.stringify({
      quote_id: qid(1),
      price: 3000,
      note: '極簡櫻花很適合手腕，預計 1.5 小時',
      available_dates: ['下週三', '下週五'],
      status: 'sent',
    }),
  },

  // Inquiry #3 (accepted - full conversation)
  {
    id: mid(6),
    inquiry_id: iid(3),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小明 向 Shadow Line 暗線刺青 發送了詢價',
    metadata: null,
  },
  {
    id: mid(7),
    inquiry_id: iid(3),
    sender_type: 'consumer',
    sender_id: 'consumer-001',
    message_type: 'text',
    content: '嗨！我看了你的幾何作品很喜歡，想做一個曼陀羅',
    metadata: null,
  },
  {
    id: mid(8),
    inquiry_id: iid(3),
    sender_type: 'artist',
    sender_id: 'artist-shadow-line',
    message_type: 'text',
    content: '謝謝！曼陀羅是我最喜歡做的圖案之一。你想要多大的？',
    metadata: null,
  },
  {
    id: mid(9),
    inquiry_id: iid(3),
    sender_type: 'consumer',
    sender_id: 'consumer-001',
    message_type: 'text',
    content: '大概 12cm 左右，在上臂外側',
    metadata: null,
  },
  {
    id: mid(10),
    inquiry_id: iid(3),
    sender_type: 'artist',
    sender_id: 'artist-shadow-line',
    message_type: 'quote',
    content: '報價：$6,000',
    metadata: JSON.stringify({
      quote_id: qid(2),
      price: 6000,
      note: '幾何曼陀羅需要約 3 小時，建議一次完成',
      available_dates: ['週六', '週日'],
      status: 'accepted',
    }),
  },
  {
    id: mid(11),
    inquiry_id: iid(3),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小明 已接受報價',
    metadata: null,
  },
  {
    id: mid(12),
    inquiry_id: iid(3),
    sender_type: 'consumer',
    sender_id: 'consumer-001',
    message_type: 'text',
    content: '太好了！我選週六可以嗎？',
    metadata: null,
  },
  {
    id: mid(13),
    inquiry_id: iid(3),
    sender_type: 'artist',
    sender_id: 'artist-shadow-line',
    message_type: 'text',
    content: '沒問題，週六下午 2 點，地址是高雄市前鎮區 XX 路 OO 號',
    metadata: null,
  },

  // Inquiry #4 (closed)
  {
    id: mid(14),
    inquiry_id: iid(4),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小明 向 InkedWolf 刺青 發送了詢價',
    metadata: null,
  },
  {
    id: mid(15),
    inquiry_id: iid(4),
    sender_type: 'artist',
    sender_id: 'artist-inked-wolf',
    message_type: 'quote',
    content: '報價：$2,500',
    metadata: JSON.stringify({
      quote_id: qid(3),
      price: 2500,
      note: '小圖快速完成',
      available_dates: ['隨時'],
      status: 'accepted',
    }),
  },
  {
    id: mid(16),
    inquiry_id: iid(4),
    sender_type: 'consumer',
    sender_id: 'consumer-001',
    message_type: 'text',
    content: '刺好了！很滿意，謝謝！',
    metadata: null,
  },

  // Inquiry #5 (quote request - InkedWolf quoted)
  {
    id: mid(17),
    inquiry_id: iid(5),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '阿偉 向 InkedWolf 刺青 發送了詢價（批次詢價）',
    metadata: null,
  },
  {
    id: mid(18),
    inquiry_id: iid(5),
    sender_type: 'artist',
    sender_id: 'artist-inked-wolf',
    message_type: 'quote',
    content: '報價：$12,000',
    metadata: JSON.stringify({
      quote_id: qid(4),
      price: 12000,
      note: '寫實鯉魚需要分兩次施作',
      available_dates: ['下週六第一次', '兩週後第二次'],
      status: 'sent',
    }),
  },

  // Inquiry #6 (quote request - Sakura quoted)
  {
    id: mid(19),
    inquiry_id: iid(6),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '阿偉 向 Sakura Ink 櫻花刺青 發送了詢價（批次詢價）',
    metadata: null,
  },
  {
    id: mid(20),
    inquiry_id: iid(6),
    sender_type: 'artist',
    sender_id: 'artist-sakura-ink',
    message_type: 'quote',
    content: '報價：$10,000',
    metadata: JSON.stringify({
      quote_id: qid(5),
      price: 10000,
      note: '日式傳統鯉魚是我的專長！',
      available_dates: ['這週末', '下週三'],
      status: 'sent',
    }),
  },

  // Inquiry #7 (quote request - ShadowLine pending)
  {
    id: mid(21),
    inquiry_id: iid(7),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '阿偉 向 Shadow Line 暗線刺青 發送了詢價（批次詢價）',
    metadata: null,
  },

  // Inquiry #8 (pending to InkedWolf)
  {
    id: mid(22),
    inquiry_id: iid(8),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '阿偉 向 InkedWolf 刺青 發送了詢價（批次詢價）',
    metadata: null,
  },

  // Inquiry #9 (小明 → Sakura, quoted with viewed quote)
  {
    id: mid(23),
    inquiry_id: iid(9),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小明 向 Sakura Ink 櫻花刺青 發送了詢價',
    metadata: null,
  },
  {
    id: mid(24),
    inquiry_id: iid(9),
    sender_type: 'consumer',
    sender_id: 'consumer-001',
    message_type: 'text',
    content: '想做一個大型的龍紋，日式傳統風格',
    metadata: null,
  },
  {
    id: mid(25),
    inquiry_id: iid(9),
    sender_type: 'artist',
    sender_id: 'artist-sakura-ink',
    message_type: 'quote',
    content: '報價：$18,000',
    metadata: JSON.stringify({
      quote_id: qid(6),
      price: 18000,
      note: '大面積龍紋需要分三次施作',
      available_dates: ['需要面議時程'],
      status: 'viewed',
    }),
  },

  // Inquiry #10 (小美 → Harvey, pending)
  {
    id: mid(26),
    inquiry_id: iid(10),
    sender_type: 'system',
    sender_id: null,
    message_type: 'system',
    content: '小美 向 Harvey (Admin) 發送了詢價',
    metadata: null,
  },
  {
    id: mid(27),
    inquiry_id: iid(10),
    sender_type: 'consumer',
    sender_id: 'consumer-002',
    message_type: 'text',
    content: '你好，我想要一個小小的水彩蝴蝶在鎖骨上',
    metadata: null,
  },
]

// --- Favorites ---
export const SEED_FAVORITES = [
  { consumer_line_id: 'consumer-001', artist_id: ARTIST_IDS.INKED_WOLF },
  { consumer_line_id: 'consumer-001', artist_id: ARTIST_IDS.SAKURA_INK },
  { consumer_line_id: 'consumer-002', artist_id: ARTIST_IDS.SHADOW_LINE },
]
