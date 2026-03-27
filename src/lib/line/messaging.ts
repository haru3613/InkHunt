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
  description: string,
  baseUrl: string,
  inquiryId: string,
): messagingApi.FlexMessage {
  return {
    type: 'flex',
    altText: `新詢價：${truncate(description, 47)}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '收到新詢價',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: truncate(description, 50),
            size: 'sm',
            color: '#999999',
            wrap: true,
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
              label: '查看詳情',
              uri: `${baseUrl}/artist/dashboard?inquiry=${inquiryId}`,
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
  const lineUserId = await getArtistLineId(inquiry.artist_id)
  if (!lineUserId) return

  const client = getMessagingClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const message = buildInquiryNotificationMessage(
    inquiry.description,
    baseUrl,
    inquiry.id,
  )
  await client.pushMessage({ to: lineUserId, messages: [message] })
}

export async function pushQuoteNotification(
  inquiry: Inquiry,
  quote: Quote,
  artistName: string,
): Promise<void> {
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
}

export async function pushNewMessageNotification(
  inquiry: Inquiry,
  chatMessage: Message,
  senderType: 'consumer' | 'artist',
  senderName: string,
): Promise<void> {
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
}
