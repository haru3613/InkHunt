import { randomBytes } from 'crypto'

const LINE_AUTH_BASE = 'https://access.line.me/oauth2/v2.1'
const LINE_API_BASE = 'https://api.line.me/oauth2/v2.1'

interface LineAuthUrl {
  url: string
  state: string
  nonce: string
}

interface LineTokenResponse {
  access_token: string
  id_token: string
  token_type: string
  expires_in: number
  refresh_token: string
  scope: string
}

interface LineProfile {
  userId: string
  displayName: string
  pictureUrl?: string
}

export function getLineAuthUrl(): LineAuthUrl {
  const state = randomBytes(16).toString('hex')
  const nonce = randomBytes(16).toString('hex')
  const channelId = process.env.LINE_CHANNEL_ID!
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const redirectUri = `${baseUrl}/api/auth/line/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: 'profile openid email',
    nonce,
  })

  return {
    url: `${LINE_AUTH_BASE}/authorize?${params.toString()}`,
    state,
    nonce,
  }
}

export async function exchangeCodeForTokens(
  code: string,
): Promise<LineTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL!}/api/auth/line/callback`,
    client_id: process.env.LINE_CHANNEL_ID!,
    client_secret: process.env.LINE_CHANNEL_SECRET!,
  })

  const response = await fetch(`${LINE_API_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(
      `LINE token exchange failed: ${error.error ?? response.status}`,
    )
  }

  return response.json()
}

export async function getLineProfile(
  accessToken: string,
): Promise<LineProfile> {
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`LINE profile fetch failed: ${response.status}`)
  }

  return response.json()
}
