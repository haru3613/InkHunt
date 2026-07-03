import { messagingApi } from '@line/bot-sdk'
import type { Artist, Inquiry, Quote, Message } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPrice, truncate } from '@/lib/utils'

let messagingClient: messagingApi.MessagingApiClient | null = null

function getMessagingClient(): messagingApi.MessagingApiClient {
  if (!messagingClient) {
    messagingClient = new messagingApi.MessagingApiClient({
      channelAccessToken: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!,
    })
  }
  return messagingClient
}

export function buildInquiryNotificationMessage(
  inquiry: Inquiry,
  baseUrl: string,
): messagingApi.FlexMessage {
  const consumerLabel = inquiry.consumer_name || '匿名用戶'
  const details: messagingApi.FlexComponent[] = []

  if (inquiry.body_part) {
    details.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '部位', size: 'sm', color: '#999999', flex: 2 },
        { type: 'text', text: inquiry.body_part, size: 'sm', color: '#EEEEEE', flex: 5, wrap: true },
      ],
    })
  }

  if (inquiry.size_estimate) {
    details.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '尺寸', size: 'sm', color: '#999999', flex: 2 },
        { type: 'text', text: inquiry.size_estimate, size: 'sm', color: '#EEEEEE', flex: 5 },
      ],
    })
  }

  if (inquiry.budget_min != null || inquiry.budget_max != null) {
    const budgetText =
      inquiry.budget_min != null && inquiry.budget_max != null
        ? `${formatPrice(inquiry.budget_min)} ~ ${formatPrice(inquiry.budget_max)}`
        : inquiry.budget_min != null
          ? `${formatPrice(inquiry.budget_min)} 起`
          : `${formatPrice(inquiry.budget_max!)} 以內`
    details.push({
      type: 'box',
      layout: 'horizontal',
      contents: [
        { type: 'text', text: '預算', size: 'sm', color: '#999999', flex: 2 },
        { type: 'text', text: budgetText, size: 'sm', color: '#C8A97E', flex: 5, weight: 'bold' },
      ],
    })
  }

  return {
    type: 'flex',
    altText: `${consumerLabel} 的新詢價：${truncate(inquiry.description, 40)}`,
    contents: {
      type: 'bubble',
      styles: {
        body: { backgroundColor: '#1A1A1A' },
        footer: { backgroundColor: '#1A1A1A' },
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '收到新詢價',
            weight: 'bold',
            size: 'lg',
            color: '#F5F0EB',
          },
          {
            type: 'text',
            text: `來自 ${consumerLabel}`,
            size: 'sm',
            color: '#C8A97E',
          },
          { type: 'separator', color: '#333333' },
          {
            type: 'text',
            text: truncate(inquiry.description, 80),
            size: 'sm',
            color: '#CCCCCC',
            wrap: true,
          },
          ...(details.length > 0
            ? [
                { type: 'separator', color: '#333333' } as messagingApi.FlexComponent,
                ...details,
              ]
            : []),
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '查看詳情',
              uri: `${baseUrl}/artist/dashboard?inquiry=${inquiry.id}`,
            },
            style: 'primary',
            color: '#C8A97E',
          },
        ],
      },
    },
  }
}

export function buildQuoteNotificationMessage(
  artistName: string,
  price: number,
  baseUrl: string,
  inquiryId: string,
): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: `${artistName} 已報價 ${formatPrice(price)}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: `${artistName} 已回覆報價`,
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: formatPrice(price),
            size: 'xl',
            weight: 'bold',
            color: '#C8A97E',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '查看報價',
              uri: `${baseUrl}/inquiries/${inquiryId}`,
            },
            style: 'primary',
            color: '#C8A97E',
          },
        ],
      },
    },
  }
}

export function buildReviewOutcomeMessage(
  artist: Artist,
  outcome: 'approved' | 'rejected',
  baseUrl: string,
): messagingApi.FlexMessage {
  const approved = outcome === 'approved'
  const title = approved ? '審核通過 🎉' : '審核結果通知'
  const bodyText = approved
    ? '恭喜！你的 InkHunt 刺青師申請已通過審核，個人檔案即將上線。點擊下方前往管理後台，完善作品集與服務資訊。'
    : '很遺憾，你的 InkHunt 刺青師申請這次未通過審核。如有疑問，歡迎直接回覆此訊息與我們聯繫。'

  const body: messagingApi.FlexBox = {
    type: 'box',
    layout: 'vertical',
    spacing: 'md',
    contents: [
      { type: 'text', text: title, weight: 'bold', size: 'lg', color: '#F5F0EB' },
      { type: 'text', text: artist.display_name, size: 'sm', color: '#C8A97E' },
      { type: 'separator', color: '#333333' },
      { type: 'text', text: bodyText, size: 'sm', color: '#CCCCCC', wrap: true },
    ],
  }

  const bubble: messagingApi.FlexBubble = {
    type: 'bubble',
    styles: {
      body: { backgroundColor: '#1A1A1A' },
      ...(approved ? { footer: { backgroundColor: '#1A1A1A' } } : {}),
    },
    body,
    // rejected has no CTA — omit footer entirely (an empty box is invalid flex)
    ...(approved
      ? {
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'uri',
                  label: '前往管理後台',
                  uri: `${baseUrl}/artist/dashboard`,
                },
                style: 'primary',
                color: '#C8A97E',
              },
            ],
          },
        }
      : {}),
  }

  return {
    type: 'flex',
    altText: approved ? 'InkHunt 審核通過' : 'InkHunt 審核結果通知',
    contents: bubble,
  }
}

async function getArtistLineId(artistId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('artists')
    .select('line_user_id')
    .eq('id', artistId)
    .single()

  return (data as Pick<Artist, 'line_user_id'> | null)?.line_user_id ?? null
}

export async function pushNewInquiryNotification(
  inquiry: Inquiry,
): Promise<void> {
  try {
    const lineUserId = await getArtistLineId(inquiry.artist_id)
    if (!lineUserId) return

    const client = getMessagingClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
    const message = buildInquiryNotificationMessage(inquiry, baseUrl)
    await client.pushMessage({ to: lineUserId, messages: [message] })
  } catch {
    // LINE notification failure is non-fatal — do not propagate to API handler
  }
}

export async function pushReviewOutcomeNotification(
  artist: Artist,
  outcome: 'approved' | 'rejected',
): Promise<void> {
  try {
    const lineUserId = artist.line_user_id
    if (!lineUserId) return

    const client = getMessagingClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
    const message = buildReviewOutcomeMessage(artist, outcome, baseUrl)
    await client.pushMessage({ to: lineUserId, messages: [message] })
  } catch {
    // LINE notification failure is non-fatal — do not propagate to API handler
  }
}

export async function pushQuoteNotification(
  inquiry: Inquiry,
  quote: Quote,
  artistName: string,
): Promise<void> {
  try {
    const client = getMessagingClient()
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
    const message = buildQuoteNotificationMessage(
      artistName,
      quote.price,
      baseUrl,
      inquiry.id,
    )
    await client.pushMessage({
      to: inquiry.consumer_line_id,
      messages: [message],
    })
  } catch {
    // LINE notification failure is non-fatal — do not propagate to API handler
  }
}

export async function pushNewMessageNotification(
  inquiry: Inquiry,
  chatMessage: Message,
  senderType: 'consumer' | 'artist',
  senderName: string,
): Promise<void> {
  try {
    let recipientLineId: string
    if (senderType === 'consumer') {
      const lineUserId = await getArtistLineId(inquiry.artist_id)
      if (!lineUserId) return
      recipientLineId = lineUserId
    } else {
      recipientLineId = inquiry.consumer_line_id
    }

    const client = getMessagingClient()
    const contentPreview =
      chatMessage.message_type === 'image'
        ? '傳了一張圖片'
        : truncate(chatMessage.content ?? '', 50)

    await client.pushMessage({
      to: recipientLineId,
      messages: [{ type: 'text', text: `${senderName}：${contentPreview}` }],
    })
  } catch {
    // LINE notification failure is non-fatal — do not propagate to API handler
  }
}
