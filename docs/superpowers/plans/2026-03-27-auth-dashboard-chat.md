# Auth + Artist Dashboard + Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement LINE Login authentication, artist dashboard with real-time chat, inquiry/quote APIs, and bidirectional LINE push notifications.

**Architecture:** Supabase Auth with LINE OIDC (`signInWithIdToken`) for auth. Supabase Realtime postgres_changes on `messages` table for chat. LINE Messaging API for push notifications. All API routes use Next.js Route Handlers with Zod validation.

**Tech Stack:** Next.js 15 (App Router), Supabase (Auth + Realtime + Storage), `@line/liff`, `@line/bot-sdk`, Zod, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-27-auth-dashboard-chat-design.md`

---

## File Structure

### New Files

```
src/
  middleware.ts                              # Root Next.js middleware (route protection)
  lib/
    line/
      auth.ts                               # LINE OAuth helpers (getAuthUrl, exchangeCode, verifyIdToken)
      messaging.ts                          # LINE Messaging API push notifications
      liff.ts                               # LIFF client-side init + helpers
    supabase/
      queries/
        inquiries.ts                        # Inquiry CRUD queries
        messages.ts                         # Message queries
        quotes.ts                           # Quote queries
    auth/
      helpers.ts                            # getCurrentUser, requireAuth, getArtistForUser
    upload/
      storage.ts                            # Supabase Storage signed URL helper
  app/
    api/
      inquiries/
        [id]/
          route.ts                          # GET inquiry detail, PATCH status
          messages/
            route.ts                        # GET messages, POST send message
      upload/
        signed-url/
          route.ts                          # POST get signed upload URL
    (artist)/
      artist/
        layout.tsx                          # Artist dashboard layout (sidebar + auth guard)
    (public)/
      inquiries/
        page.tsx                            # Consumer chat list
        [id]/
          page.tsx                          # Consumer chat window
  components/
    chat/
      ChatList.tsx                          # Conversation list sidebar
      ChatWindow.tsx                        # Message stream + input
      MessageBubble.tsx                     # Single message render
      QuoteCard.tsx                         # Quote special message card
      ChatInput.tsx                         # Text + image + quote input bar
    artists/
      ProfileForm.tsx                       # Artist profile edit form
      PortfolioGrid.tsx                     # Portfolio management grid
      PortfolioUploader.tsx                 # Image upload for portfolio
      ArtistDashboardNav.tsx                # Dashboard sidebar / mobile bottom nav
  hooks/
    useRealtimeMessages.ts                  # Supabase Realtime chat subscription
    useAuth.ts                              # Auth state + artist status hook
  types/
    chat.ts                                 # Chat/message type definitions
supabase/
  migrations/
    003_messages_table.sql                  # messages table + RLS + realtime
```

### Modified Files

```
src/
  types/
    database.ts                             # Add messages table types
    api.ts                                  # Add chat/message API types
  lib/
    supabase/
      middleware.ts                         # Add route protection logic
  app/
    api/
      auth/line/callback/route.ts           # Implement LINE OAuth callback
      auth/me/route.ts                      # Implement get current user
      inquiries/route.ts                    # Implement create + list inquiries
      inquiries/[id]/quotes/route.ts        # Implement create + respond to quotes
      upload/route.ts                       # Delete (replaced by signed-url)
    (artist)/artist/
      page.tsx                              # Rewrite: entry/login/status page
      dashboard/page.tsx                    # Rewrite: chat dashboard
      profile/page.tsx                      # Rewrite: profile editor
      portfolio/page.tsx                    # Rewrite: portfolio management
  components/
    inquiry/InquiryForm.tsx                 # Wire to auth + real API
  .env.local.example                        # Add ADMIN_LINE_USER_IDS
```

---

## Phase 1: Foundation (Auth + DB)

### Task 1: DB Migration — messages table

**Files:**
- Create: `supabase/migrations/003_messages_table.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/003_messages_table.sql

-- Chat messages (one inquiry = one conversation)
CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id    UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  sender_type   TEXT NOT NULL CHECK (sender_type IN ('consumer', 'artist', 'system')),
  sender_id     TEXT,  -- line_user_id, NULL for system messages
  message_type  TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'quote', 'system')),
  content       TEXT,  -- text content or image URL
  metadata      JSONB DEFAULT '{}',
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_messages_inquiry ON messages(inquiry_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created ON messages(inquiry_id, created_at);
CREATE INDEX idx_messages_unread ON messages(inquiry_id, read_at) WHERE read_at IS NULL;

-- RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Consumer can read/write messages in their own inquiries
CREATE POLICY "Consumer can read own inquiry messages" ON messages
  FOR SELECT USING (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
  );

CREATE POLICY "Consumer can send messages to own inquiries" ON messages
  FOR INSERT WITH CHECK (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
    AND sender_type = 'consumer'
    AND sender_id = auth.jwt()->>'sub'
  );

-- Artist can read/write messages in inquiries they received
CREATE POLICY "Artist can read received inquiry messages" ON messages
  FOR SELECT USING (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
  );

CREATE POLICY "Artist can send messages to received inquiries" ON messages
  FOR INSERT WITH CHECK (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
    AND sender_type = 'artist'
    AND sender_id = auth.jwt()->>'sub'
  );

-- System messages can be inserted by service role only (no user policy needed)

-- Allow participants to mark messages as read
CREATE POLICY "Consumer can mark messages read in own inquiries" ON messages
  FOR UPDATE USING (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
  ) WITH CHECK (
    inquiry_id IN (SELECT id FROM inquiries WHERE consumer_line_id = auth.jwt()->>'sub')
  );

CREATE POLICY "Artist can mark messages read in received inquiries" ON messages
  FOR UPDATE USING (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
  ) WITH CHECK (
    inquiry_id IN (
      SELECT i.id FROM inquiries i
      JOIN artists a ON a.id = i.artist_id
      WHERE a.line_user_id = auth.jwt()->>'sub'
    )
  );

-- Enable Realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push` (or apply via Supabase Dashboard SQL editor)
Expected: Table created, RLS policies active, Realtime enabled

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/003_messages_table.sql
git commit -m "feat: add messages table migration with RLS and Realtime"
```

---

### Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/database.ts`
- Create: `src/types/chat.ts`
- Modify: `src/types/api.ts`

- [ ] **Step 1: Add messages table to database.ts**

Add inside `Database.public.Tables` after `favorites`:

```typescript
messages: {
  Row: {
    id: string
    inquiry_id: string
    sender_type: 'consumer' | 'artist' | 'system'
    sender_id: string | null
    message_type: 'text' | 'image' | 'quote' | 'system'
    content: string | null
    metadata: Json
    read_at: string | null
    created_at: string
  }
  Insert: {
    id?: string
    inquiry_id: string
    sender_type: 'consumer' | 'artist' | 'system'
    sender_id?: string | null
    message_type: 'text' | 'image' | 'quote' | 'system'
    content?: string | null
    metadata?: Json
    read_at?: string | null
    created_at?: string
  }
  Update: {
    id?: string
    inquiry_id?: string
    sender_type?: 'consumer' | 'artist' | 'system'
    sender_id?: string | null
    message_type?: 'text' | 'image' | 'quote' | 'system'
    content?: string | null
    metadata?: Json
    read_at?: string | null
    created_at?: string
  }
}
```

Add convenience aliases at bottom:

```typescript
export type Message = Database['public']['Tables']['messages']['Row']
export type MessageInsert = Database['public']['Tables']['messages']['Insert']
```

- [ ] **Step 2: Create chat types**

```typescript
// src/types/chat.ts
import type { Message, Inquiry, Artist } from './database'

export interface ChatConversation {
  inquiry: Inquiry
  artist: Pick<Artist, 'id' | 'slug' | 'display_name' | 'avatar_url'>
  last_message: Message | null
  unread_count: number
}

export interface ChatConversationList {
  conversations: ChatConversation[]
  total: number
}

export interface QuoteMetadata {
  quote_id: string
  price: number
  note: string | null
  available_dates: string[] | null
  status: 'sent' | 'viewed' | 'accepted' | 'rejected'
}

export interface SendMessageRequest {
  message_type: 'text' | 'image'
  content: string
}

export interface SendQuoteRequest {
  price: number
  note?: string
  available_dates?: string[]
}

export interface SignedUrlRequest {
  bucket: 'portfolio' | 'inquiries'
  filename: string
  content_type: string
}

export interface SignedUrlResponse {
  signed_url: string
  public_url: string
  path: string
}
```

- [ ] **Step 3: Update api.ts with chat-related types**

Add to `src/types/api.ts`:

```typescript
// Chat / Messages
export interface InquiryListItem {
  id: string
  artist_id: string
  artist_slug: string
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_line_id: string
  consumer_name: string | null
  description: string
  body_part: string | null
  status: 'pending' | 'quoted' | 'accepted' | 'closed'
  last_message_content: string | null
  last_message_at: string | null
  unread_count: number
  created_at: string
}

export interface InquiryDetailResponse {
  inquiry: Inquiry
  artist: Pick<Artist, 'id' | 'slug' | 'display_name' | 'avatar_url'>
  messages: Message[]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/types/database.ts src/types/chat.ts src/types/api.ts
git commit -m "feat: add message types and chat API type definitions"
```

---

### Task 3: LINE Auth Library

**Files:**
- Create: `src/lib/line/auth.ts`
- Test: `src/lib/line/__tests__/auth.test.ts`

- [ ] **Step 1: Write tests for LINE auth helpers**

```typescript
// src/lib/line/__tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getLineAuthUrl, exchangeCodeForTokens, verifyLineIdToken } from '../auth'

describe('getLineAuthUrl', () => {
  beforeEach(() => {
    vi.stubEnv('LINE_CHANNEL_ID', 'test-channel-id')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
  })

  it('returns a valid LINE authorize URL with required params', () => {
    const { url, state, nonce } = getLineAuthUrl()
    const parsed = new URL(url)
    expect(parsed.origin).toBe('https://access.line.me')
    expect(parsed.pathname).toBe('/oauth2/v2.1/authorize')
    expect(parsed.searchParams.get('response_type')).toBe('code')
    expect(parsed.searchParams.get('client_id')).toBe('test-channel-id')
    expect(parsed.searchParams.get('scope')).toContain('profile')
    expect(parsed.searchParams.get('scope')).toContain('openid')
    expect(parsed.searchParams.get('state')).toBe(state)
    expect(parsed.searchParams.get('nonce')).toBe(nonce)
    expect(state).toBeTruthy()
    expect(nonce).toBeTruthy()
  })

  it('includes redirect_uri pointing to callback endpoint', () => {
    const { url } = getLineAuthUrl()
    const parsed = new URL(url)
    expect(parsed.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/auth/line/callback'
    )
  })
})

describe('exchangeCodeForTokens', () => {
  beforeEach(() => {
    vi.stubEnv('LINE_CHANNEL_ID', 'test-channel-id')
    vi.stubEnv('LINE_CHANNEL_SECRET', 'test-secret')
    vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000')
  })

  it('calls LINE token endpoint with correct params', async () => {
    const mockResponse = {
      access_token: 'access-123',
      id_token: 'id-token-jwt',
      token_type: 'Bearer',
      expires_in: 2592000,
      refresh_token: 'refresh-123',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    })

    const result = await exchangeCodeForTokens('auth-code-123')
    expect(result.id_token).toBe('id-token-jwt')
    expect(result.access_token).toBe('access-123')

    const fetchCall = vi.mocked(fetch).mock.calls[0]
    expect(fetchCall[0]).toBe('https://api.line.me/oauth2/v2.1/token')
    const body = fetchCall[1]?.body as URLSearchParams
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('auth-code-123')
    expect(body.get('client_id')).toBe('test-channel-id')
    expect(body.get('client_secret')).toBe('test-secret')
  })

  it('throws on failed token exchange', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'invalid_grant' }),
    })

    await expect(exchangeCodeForTokens('bad-code')).rejects.toThrow(
      'LINE token exchange failed'
    )
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/line/__tests__/auth.test.ts`
Expected: FAIL — module `../auth` not found

- [ ] **Step 3: Implement LINE auth helpers**

```typescript
// src/lib/line/auth.ts
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
    throw new Error(`LINE token exchange failed: ${error.error ?? response.status}`)
  }

  return response.json()
}

export async function getLineProfile(
  accessToken: string,
): Promise<{ userId: string; displayName: string; pictureUrl?: string }> {
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error(`LINE profile fetch failed: ${response.status}`)
  }

  return response.json()
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/line/__tests__/auth.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/line/auth.ts src/lib/line/__tests__/auth.test.ts
git commit -m "feat: add LINE OAuth auth helpers (getAuthUrl, exchangeCode, getProfile)"
```

---

### Task 4: LINE OAuth Callback + Auth Helpers

**Files:**
- Create: `src/lib/auth/helpers.ts`
- Modify: `src/app/api/auth/line/callback/route.ts`
- Modify: `src/app/api/auth/me/route.ts`
- Test: `src/lib/auth/__tests__/helpers.test.ts`

- [ ] **Step 1: Write tests for auth helpers**

```typescript
// src/lib/auth/__tests__/helpers.test.ts
import { describe, it, expect, vi } from 'vitest'
import { extractUserFromSession, getArtistForUser } from '../helpers'

describe('extractUserFromSession', () => {
  it('returns null when no session', () => {
    const result = extractUserFromSession(null)
    expect(result).toBeNull()
  })

  it('extracts user info from valid session', () => {
    const mockSession = {
      user: {
        id: 'supabase-uuid',
        user_metadata: {
          sub: 'U1234567890',
          name: 'Test User',
          picture: 'https://example.com/pic.jpg',
        },
      },
    }
    const result = extractUserFromSession(mockSession as any)
    expect(result).toEqual({
      supabaseId: 'supabase-uuid',
      lineUserId: 'U1234567890',
      displayName: 'Test User',
      avatarUrl: 'https://example.com/pic.jpg',
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/auth/__tests__/helpers.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement auth helpers**

```typescript
// src/lib/auth/helpers.ts
import type { Session } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import type { Artist } from '@/types/database'

export interface AuthUser {
  supabaseId: string
  lineUserId: string
  displayName: string
  avatarUrl: string | null
}

export function extractUserFromSession(session: Session | null): AuthUser | null {
  if (!session?.user) return null

  const meta = session.user.user_metadata
  return {
    supabaseId: session.user.id,
    lineUserId: meta.sub ?? meta.provider_id ?? '',
    displayName: meta.name ?? meta.full_name ?? '',
    avatarUrl: meta.picture ?? meta.avatar_url ?? null,
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  return extractUserFromSession(session)
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function getArtistForUser(lineUserId: string): Promise<Artist | null> {
  const supabase = await createServerClient()
  const { data } = await supabase
    .from('artists')
    .select('*')
    .eq('line_user_id', lineUserId)
    .single()
  return data
}

export function isAdmin(lineUserId: string): boolean {
  const adminIds = process.env.ADMIN_LINE_USER_IDS?.split(',') ?? []
  return adminIds.includes(lineUserId)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/auth/__tests__/helpers.test.ts`
Expected: PASS

- [ ] **Step 5: Implement LINE OAuth callback route**

```typescript
// src/app/api/auth/line/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@/lib/supabase/server'
import { exchangeCodeForTokens, getLineProfile } from '@/lib/line/auth'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}?auth_error=${error ?? 'no_code'}`)
  }

  // Validate state against stored state cookie
  const cookieStore = await cookies()
  const storedState = cookieStore.get('line_auth_state')?.value
  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${baseUrl}?auth_error=invalid_state`)
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get LINE profile for user metadata
    const profile = await getLineProfile(tokens.access_token)

    // Sign in to Supabase with LINE ID token
    const supabase = await createServerClient()
    const { error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'kakao', // Custom OIDC provider configured as LINE in Supabase
      token: tokens.id_token,
      nonce: cookieStore.get('line_auth_nonce')?.value ?? '',
    })

    if (authError) {
      // Fallback: sign in with email-based approach if OIDC fails
      console.error('signInWithIdToken failed, trying admin approach:', authError.message)

      const { createAdminClient } = await import('@/lib/supabase/server')
      const adminClient = createAdminClient()

      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const existingUser = existingUsers?.users.find(
        u => u.user_metadata?.line_user_id === profile.userId
      )

      if (existingUser) {
        // Update metadata and sign in via magic link workaround
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            line_user_id: profile.userId,
            name: profile.displayName,
            picture: profile.pictureUrl,
            sub: profile.userId,
          },
        })
      } else {
        // Create new user
        await adminClient.auth.admin.createUser({
          email: `${profile.userId}@line.inkhunt.local`,
          email_confirm: true,
          user_metadata: {
            line_user_id: profile.userId,
            name: profile.displayName,
            picture: profile.pictureUrl,
            sub: profile.userId,
            provider: 'line',
          },
        })
      }

      // Sign in as the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: `${profile.userId}@line.inkhunt.local`,
        password: profile.userId, // Simple for MVP — the actual auth is via LINE
      })

      if (signInError) {
        // Set password and retry
        const adminClient2 = createAdminClient()
        const { data: users2 } = await adminClient2.auth.admin.listUsers()
        const user2 = users2?.users.find(
          u => u.user_metadata?.line_user_id === profile.userId
        )
        if (user2) {
          await adminClient2.auth.admin.updateUserById(user2.id, {
            password: profile.userId,
          })
          await supabase.auth.signInWithPassword({
            email: `${profile.userId}@line.inkhunt.local`,
            password: profile.userId,
          })
        }
      }
    }

    // Clean up state cookies
    cookieStore.delete('line_auth_state')
    cookieStore.delete('line_auth_nonce')

    // Redirect to original page or home
    const redirectTo = cookieStore.get('line_auth_redirect')?.value ?? '/'
    cookieStore.delete('line_auth_redirect')

    return NextResponse.redirect(`${baseUrl}${redirectTo}`)
  } catch (err) {
    console.error('LINE callback error:', err)
    return NextResponse.redirect(`${baseUrl}?auth_error=callback_failed`)
  }
}
```

- [ ] **Step 6: Implement /api/auth/me route**

```typescript
// src/app/api/auth/me/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUser, getArtistForUser } from '@/lib/auth/helpers'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ user: null, artist: null })
  }

  const artist = await getArtistForUser(user.lineUserId)

  return NextResponse.json({
    user: {
      lineUserId: user.lineUserId,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
    },
    artist: artist
      ? {
          id: artist.id,
          slug: artist.slug,
          display_name: artist.display_name,
          status: artist.status,
        }
      : null,
  })
}
```

- [ ] **Step 7: Create LINE login initiation route**

```typescript
// src/app/api/auth/line/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getLineAuthUrl } from '@/lib/line/auth'

export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get('redirect') ?? '/'
  const { url, state, nonce } = getLineAuthUrl()

  const cookieStore = await cookies()
  const cookieOptions = { httpOnly: true, secure: true, maxAge: 600, path: '/' }
  cookieStore.set('line_auth_state', state, cookieOptions)
  cookieStore.set('line_auth_nonce', nonce, cookieOptions)
  cookieStore.set('line_auth_redirect', redirectTo, cookieOptions)

  return NextResponse.redirect(url)
}
```

- [ ] **Step 8: Add ADMIN_LINE_USER_IDS to .env.local.example**

Append to `.env.local.example`:

```
# Admin
ADMIN_LINE_USER_IDS=
```

- [ ] **Step 9: Commit**

```bash
git add src/lib/auth/ src/app/api/auth/ .env.local.example
git commit -m "feat: implement LINE OAuth callback, auth helpers, and login initiation"
```

---

### Task 5: Next.js Root Middleware (Route Protection)

**Files:**
- Create: `src/middleware.ts`
- Modify: `src/lib/supabase/middleware.ts`

- [ ] **Step 1: Update Supabase middleware helper to return user info**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return { response: NextResponse.next({ request }), user: null }
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  return { response: supabaseResponse, user }
}
```

- [ ] **Step 2: Create root middleware with route protection**

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED_ARTIST_ROUTES = /^\/artist\/(dashboard|profile|portfolio|calendar|clients|settings|stats)/
const PROTECTED_ADMIN_ROUTES = /^\/admin/
const PROTECTED_API_ROUTES = [
  { pattern: /^\/api\/inquiries$/, methods: ['POST'] },
  { pattern: /^\/api\/inquiries\/[^/]+\/messages$/, methods: ['POST'] },
  { pattern: /^\/api\/inquiries\/[^/]+\/quotes$/, methods: ['POST'] },
  { pattern: /^\/api\/upload\/signed-url$/, methods: ['POST'] },
]

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Check protected artist routes
  if (PROTECTED_ARTIST_ROUTES.test(pathname)) {
    if (!user) {
      const loginUrl = new URL('/api/auth/line', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    // Artist status check happens at page level (needs DB query)
  }

  // Check protected admin routes
  if (PROTECTED_ADMIN_ROUTES.test(pathname)) {
    if (!user) {
      const loginUrl = new URL('/api/auth/line', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    const adminIds = process.env.ADMIN_LINE_USER_IDS?.split(',') ?? []
    const lineUserId = user.user_metadata?.sub ?? user.user_metadata?.line_user_id
    if (!lineUserId || !adminIds.includes(lineUserId)) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // Check protected API routes
  for (const route of PROTECTED_API_ROUTES) {
    if (route.pattern.test(pathname) && route.methods.includes(request.method)) {
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts src/lib/supabase/middleware.ts
git commit -m "feat: add Next.js root middleware with route protection for artist/admin/API"
```

---

### Task 6: LIFF Client Integration

**Files:**
- Create: `src/lib/line/liff.ts`
- Create: `src/hooks/useAuth.ts`

- [ ] **Step 1: Install @line/liff**

Run: `npm install @line/liff`

- [ ] **Step 2: Create LIFF initialization helper**

```typescript
// src/lib/line/liff.ts
'use client'

import liff from '@line/liff'

let initialized = false

export async function initLiff(): Promise<typeof liff> {
  if (initialized) return liff

  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID
  if (!liffId) {
    throw new Error('NEXT_PUBLIC_LINE_LIFF_ID is not configured')
  }

  await liff.init({ liffId })
  initialized = true
  return liff
}

export async function liffLogin(): Promise<string | null> {
  const client = await initLiff()

  if (!client.isLoggedIn()) {
    client.login()
    return null // Will redirect, no token yet
  }

  return client.getIDToken()
}

export function isInLiff(): boolean {
  return typeof window !== 'undefined' && liff.isInClient()
}
```

- [ ] **Step 3: Create useAuth hook**

```typescript
// src/hooks/useAuth.ts
'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  isLoading: boolean
  isLoggedIn: boolean
  user: {
    lineUserId: string
    displayName: string
    avatarUrl: string | null
  } | null
  artist: {
    id: string
    slug: string
    display_name: string
    status: 'pending' | 'active' | 'suspended'
  } | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    isLoading: true,
    isLoggedIn: false,
    user: null,
    artist: null,
  })

  const fetchAuthState = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()
      setState({
        isLoading: false,
        isLoggedIn: !!data.user,
        user: data.user,
        artist: data.artist,
      })
    } catch {
      setState({ isLoading: false, isLoggedIn: false, user: null, artist: null })
    }
  }, [])

  useEffect(() => {
    fetchAuthState()

    // Listen to Supabase auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchAuthState()
    })

    return () => subscription.unsubscribe()
  }, [fetchAuthState])

  const loginWithRedirect = useCallback((redirectTo?: string) => {
    const params = redirectTo ? `?redirect=${encodeURIComponent(redirectTo)}` : ''
    window.location.href = `/api/auth/line${params}`
  }, [])

  const logout = useCallback(async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setState({ isLoading: false, isLoggedIn: false, user: null, artist: null })
  }, [])

  return { ...state, loginWithRedirect, logout, refetch: fetchAuthState }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/line/liff.ts src/hooks/useAuth.ts
git commit -m "feat: add LIFF client integration and useAuth hook"
```

---

## Phase 2: Core API

### Task 7: Image Upload — Signed URL API

**Files:**
- Create: `src/lib/upload/storage.ts`
- Create: `src/app/api/upload/signed-url/route.ts`
- Delete: `src/app/api/upload/route.ts` (replaced)
- Test: `src/lib/upload/__tests__/storage.test.ts`

- [ ] **Step 1: Write tests for storage helper**

```typescript
// src/lib/upload/__tests__/storage.test.ts
import { describe, it, expect } from 'vitest'
import { validateUploadRequest } from '../storage'

describe('validateUploadRequest', () => {
  it('accepts valid image/jpeg', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid image/png', () => {
    const result = validateUploadRequest({
      bucket: 'inquiries',
      filename: 'ref.png',
      content_type: 'image/png',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid content type', () => {
    const result = validateUploadRequest({
      bucket: 'portfolio',
      filename: 'doc.pdf',
      content_type: 'application/pdf',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid bucket', () => {
    const result = validateUploadRequest({
      bucket: 'secret' as any,
      filename: 'photo.jpg',
      content_type: 'image/jpeg',
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/upload/__tests__/storage.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement storage helper**

```typescript
// src/lib/upload/storage.ts
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
const ALLOWED_BUCKETS = ['portfolio', 'inquiries'] as const
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

const uploadRequestSchema = z.object({
  bucket: z.enum(ALLOWED_BUCKETS),
  filename: z.string().min(1),
  content_type: z.enum(ALLOWED_TYPES),
})

export function validateUploadRequest(input: unknown) {
  return uploadRequestSchema.safeParse(input)
}

export async function createSignedUploadUrl(
  bucket: string,
  userId: string,
  filename: string,
  contentType: string,
): Promise<{ signed_url: string; public_url: string; path: string }> {
  const supabase = await createServerClient()
  const ext = filename.split('.').pop() ?? 'jpg'
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path)

  if (error || !data) {
    throw new Error(`Failed to create signed URL: ${error?.message ?? 'unknown'}`)
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path)

  return {
    signed_url: data.signedUrl,
    public_url: publicUrlData.publicUrl,
    path,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/upload/__tests__/storage.test.ts`
Expected: PASS

- [ ] **Step 5: Implement signed-url API route**

```typescript
// src/app/api/upload/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/helpers'
import { validateUploadRequest, createSignedUploadUrl } from '@/lib/upload/storage'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateUploadRequest(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { bucket, filename, content_type } = validation.data
    const result = await createSignedUploadUrl(
      bucket,
      user.lineUserId,
      filename,
      content_type,
    )

    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Upload signed URL error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Delete old upload route stub**

Delete `src/app/api/upload/route.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/upload/ src/app/api/upload/signed-url/route.ts
git rm src/app/api/upload/route.ts
git commit -m "feat: add Supabase Storage signed URL upload API"
```

---

### Task 8: Inquiry API (Create + List + Detail)

**Files:**
- Create: `src/lib/supabase/queries/inquiries.ts`
- Modify: `src/app/api/inquiries/route.ts`
- Create: `src/app/api/inquiries/[id]/route.ts`
- Test: `src/lib/supabase/queries/__tests__/inquiries.test.ts`

- [ ] **Step 1: Write tests for inquiry query helpers**

```typescript
// src/lib/supabase/queries/__tests__/inquiries.test.ts
import { describe, it, expect } from 'vitest'
import { validateInquiryCreate } from '../inquiries'

describe('validateInquiryCreate', () => {
  it('accepts valid inquiry', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a small geometric tattoo on my forearm',
      body_part: '手臂（前臂）',
      size_estimate: '5x5 cm',
    })
    expect(result.success).toBe(true)
  })

  it('rejects description under 10 chars', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'short',
      body_part: '手臂',
      size_estimate: '5cm',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid budget range', () => {
    const result = validateInquiryCreate({
      artist_id: '550e8400-e29b-41d4-a716-446655440000',
      description: 'I want a detailed sleeve tattoo design',
      body_part: '手臂（上臂）',
      size_estimate: '30x10 cm',
      budget_min: 10000,
      budget_max: 5000,
    })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/supabase/queries/__tests__/inquiries.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement inquiry query helpers**

```typescript
// src/lib/supabase/queries/inquiries.ts
import { z } from 'zod'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type { Inquiry, Message } from '@/types/database'

const inquiryCreateSchema = z.object({
  artist_id: z.string().uuid(),
  description: z.string().min(10, '請至少描述 10 個字').max(1000),
  reference_images: z.array(z.string().url()).max(3).default([]),
  body_part: z.string().min(1).optional(),
  size_estimate: z.string().min(1).optional(),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
}).refine(
  (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
  { message: 'budget_min must be <= budget_max', path: ['budget_min'] },
)

export function validateInquiryCreate(input: unknown) {
  return inquiryCreateSchema.safeParse(input)
}

export async function createInquiry(
  consumerLineId: string,
  consumerName: string | null,
  data: z.infer<typeof inquiryCreateSchema>,
): Promise<{ inquiry: Inquiry; messages: Message[] }> {
  const admin = createAdminClient()

  // Insert inquiry
  const { data: inquiry, error: inquiryError } = await admin
    .from('inquiries')
    .insert({
      artist_id: data.artist_id,
      consumer_line_id: consumerLineId,
      consumer_name: consumerName,
      description: data.description,
      reference_images: data.reference_images,
      body_part: data.body_part ?? null,
      size_estimate: data.size_estimate ?? null,
      budget_min: data.budget_min ?? null,
      budget_max: data.budget_max ?? null,
    })
    .select()
    .single()

  if (inquiryError || !inquiry) {
    throw new Error(`Failed to create inquiry: ${inquiryError?.message}`)
  }

  // Create system message with structured inquiry summary
  const summaryParts = [
    `📋 新詢價`,
    data.body_part ? `部位：${data.body_part}` : null,
    data.size_estimate ? `大小：${data.size_estimate}` : null,
    data.budget_min || data.budget_max
      ? `預算：NT$${data.budget_min ?? '?'} ~ NT$${data.budget_max ?? '?'}`
      : null,
    `\n${data.description}`,
  ].filter(Boolean).join('\n')

  const messagesToInsert: Array<{
    inquiry_id: string
    sender_type: 'system' | 'consumer'
    sender_id: string | null
    message_type: 'system' | 'image'
    content: string
    metadata: Record<string, unknown>
  }> = [
    {
      inquiry_id: inquiry.id,
      sender_type: 'system',
      sender_id: null,
      message_type: 'system',
      content: summaryParts,
      metadata: {
        body_part: data.body_part,
        size_estimate: data.size_estimate,
        budget_min: data.budget_min,
        budget_max: data.budget_max,
      },
    },
  ]

  // Add image messages for reference images
  for (const imageUrl of data.reference_images) {
    messagesToInsert.push({
      inquiry_id: inquiry.id,
      sender_type: 'consumer',
      sender_id: consumerLineId,
      message_type: 'image',
      content: imageUrl,
      metadata: {},
    })
  }

  const { data: messages, error: msgError } = await admin
    .from('messages')
    .insert(messagesToInsert)
    .select()

  if (msgError) {
    console.error('Failed to create initial messages:', msgError)
  }

  return { inquiry, messages: messages ?? [] }
}

export async function getInquiriesForArtist(
  artistId: string,
  status?: string,
  page = 1,
  limit = 20,
): Promise<{ data: Inquiry[]; total: number }> {
  const supabase = await createServerClient()
  let query = supabase
    .from('inquiries')
    .select('*', { count: 'exact' })
    .eq('artist_id', artistId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (status) {
    query = query.eq('status', status)
  }

  const { data, count, error } = await query

  if (error) throw new Error(`Failed to fetch inquiries: ${error.message}`)
  return { data: data ?? [], total: count ?? 0 }
}

export async function getInquiriesForConsumer(
  consumerLineId: string,
  page = 1,
  limit = 20,
): Promise<{ data: Inquiry[]; total: number }> {
  const supabase = await createServerClient()
  const { data, count, error } = await supabase
    .from('inquiries')
    .select('*', { count: 'exact' })
    .eq('consumer_line_id', consumerLineId)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (error) throw new Error(`Failed to fetch inquiries: ${error.message}`)
  return { data: data ?? [], total: count ?? 0 }
}

export async function getInquiryById(id: string): Promise<Inquiry | null> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}

export async function updateInquiryStatus(
  id: string,
  status: 'pending' | 'quoted' | 'accepted' | 'closed',
): Promise<Inquiry> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('inquiries')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to update inquiry: ${error?.message}`)
  return data
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/supabase/queries/__tests__/inquiries.test.ts`
Expected: PASS

- [ ] **Step 5: Implement POST /api/inquiries (create) and GET (list)**

```typescript
// src/app/api/inquiries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import {
  validateInquiryCreate,
  createInquiry,
  getInquiriesForArtist,
  getInquiriesForConsumer,
} from '@/lib/supabase/queries/inquiries'
import { pushNewInquiryNotification } from '@/lib/line/messaging'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = validateInquiryCreate(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const { inquiry } = await createInquiry(
      user.lineUserId,
      user.displayName,
      validation.data,
    )

    // Send LINE notification to artist (fire and forget)
    pushNewInquiryNotification(inquiry).catch((err) =>
      console.error('Failed to send LINE notification:', err),
    )

    return NextResponse.json({ id: inquiry.id }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create inquiry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const params = request.nextUrl.searchParams
    const role = params.get('role') ?? 'consumer'
    const status = params.get('status') ?? undefined
    const page = Number(params.get('page') ?? '1')

    if (role === 'artist') {
      const artist = await getArtistForUser(user.lineUserId)
      if (!artist) {
        return NextResponse.json({ error: 'Not an artist' }, { status: 403 })
      }
      const result = await getInquiriesForArtist(artist.id, status, page)
      return NextResponse.json(result)
    }

    const result = await getInquiriesForConsumer(user.lineUserId, page)
    return NextResponse.json(result)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('List inquiries error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 6: Implement GET /api/inquiries/[id] and PATCH**

```typescript
// src/app/api/inquiries/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById, updateInquiryStatus } from '@/lib/supabase/queries/inquiries'
import { getMessagesByInquiry, markMessagesAsRead } from '@/lib/supabase/queries/messages'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const inquiry = await getInquiryById(id)

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Verify access: must be consumer or artist of this inquiry
    const artist = await getArtistForUser(user.lineUserId)
    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const isArtist = artist && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch messages
    const messages = await getMessagesByInquiry(id)

    // Fetch artist info
    const supabase = await createServerClient()
    const { data: artistData } = await supabase
      .from('artists')
      .select('id, slug, display_name, avatar_url')
      .eq('id', inquiry.artist_id)
      .single()

    // Mark messages as read for this participant
    const myType = isArtist ? 'artist' : 'consumer'
    await markMessagesAsRead(id, user.lineUserId, myType)

    return NextResponse.json({
      inquiry,
      artist: artistData,
      messages,
    })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Get inquiry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const inquiry = await getInquiryById(id)

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Verify access
    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const artist = await getArtistForUser(user.lineUserId)
    const isArtist = artist && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Consumers can only close, artists can close
    if (body.status === 'closed') {
      const updated = await updateInquiryStatus(id, 'closed')
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid status update' }, { status: 400 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update inquiry error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/supabase/queries/inquiries.ts src/lib/supabase/queries/__tests__/inquiries.test.ts src/app/api/inquiries/
git commit -m "feat: implement inquiry CRUD API (create, list, detail, close)"
```

---

### Task 9: Messages API + Realtime Hook

**Files:**
- Create: `src/lib/supabase/queries/messages.ts`
- Create: `src/app/api/inquiries/[id]/messages/route.ts`
- Create: `src/hooks/useRealtimeMessages.ts`

- [ ] **Step 1: Implement message query helpers**

```typescript
// src/lib/supabase/queries/messages.ts
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import type { Message } from '@/types/database'

export async function getMessagesByInquiry(inquiryId: string): Promise<Message[]> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('inquiry_id', inquiryId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`)
  return data ?? []
}

export async function sendMessage(
  inquiryId: string,
  senderType: 'consumer' | 'artist',
  senderId: string,
  messageType: 'text' | 'image',
  content: string,
): Promise<Message> {
  const supabase = await createServerClient()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      sender_type: senderType,
      sender_id: senderId,
      message_type: messageType,
      content,
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to send message: ${error?.message}`)
  return data
}

export async function sendSystemMessage(
  inquiryId: string,
  content: string,
  metadata: Record<string, unknown> = {},
): Promise<Message> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      sender_type: 'system',
      sender_id: null,
      message_type: 'system',
      content,
      metadata,
    })
    .select()
    .single()

  if (error || !data) throw new Error(`Failed to send system message: ${error?.message}`)
  return data
}

export async function markMessagesAsRead(
  inquiryId: string,
  userId: string,
  userType: 'consumer' | 'artist',
): Promise<void> {
  const supabase = await createServerClient()
  // Mark messages not sent by this user as read
  const otherTypes = userType === 'consumer' ? ['artist', 'system'] : ['consumer', 'system']

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('inquiry_id', inquiryId)
    .in('sender_type', otherTypes)
    .is('read_at', null)
}

export async function getUnreadCountByInquiry(
  inquiryId: string,
  userType: 'consumer' | 'artist',
): Promise<number> {
  const supabase = await createServerClient()
  const otherTypes = userType === 'consumer' ? ['artist', 'system'] : ['consumer', 'system']

  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('inquiry_id', inquiryId)
    .in('sender_type', otherTypes)
    .is('read_at', null)

  if (error) return 0
  return count ?? 0
}
```

- [ ] **Step 2: Implement messages API route**

```typescript
// src/app/api/inquiries/[id]/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import { getMessagesByInquiry, sendMessage, markMessagesAsRead } from '@/lib/supabase/queries/messages'
import { pushNewMessageNotification } from '@/lib/line/messaging'
import { z } from 'zod'

const sendMessageSchema = z.object({
  message_type: z.enum(['text', 'image']),
  content: z.string().min(1).max(2000),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const inquiry = await getInquiryById(id)

    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    const artist = await getArtistForUser(user.lineUserId)
    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const isArtist = artist && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const messages = await getMessagesByInquiry(id)

    // Mark as read
    const myType = isArtist ? 'artist' : 'consumer'
    await markMessagesAsRead(id, user.lineUserId, myType)

    return NextResponse.json({ messages })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validation = sendMessageSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const inquiry = await getInquiryById(id)
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    const artist = await getArtistForUser(user.lineUserId)
    const isConsumer = inquiry.consumer_line_id === user.lineUserId
    const isArtist = artist && inquiry.artist_id === artist.id

    if (!isConsumer && !isArtist) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const senderType = isArtist ? 'artist' : 'consumer'
    const message = await sendMessage(
      id,
      senderType,
      user.lineUserId,
      validation.data.message_type,
      validation.data.content,
    )

    // Send LINE notification to the other party (fire and forget)
    pushNewMessageNotification(inquiry, message, senderType, user.displayName).catch(
      (err) => console.error('Failed to send message notification:', err),
    )

    return NextResponse.json(message, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Send message error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Create Realtime messages hook**

```typescript
// src/hooks/useRealtimeMessages.ts
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

export function useRealtimeMessages(inquiryId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!inquiryId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/messages`)
      const data = await response.json()
      setMessages(data.messages ?? [])
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setIsLoading(false)
    }
  }, [inquiryId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!inquiryId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`inquiry:${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            // Deduplicate by id
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [inquiryId])

  const sendMessage = useCallback(
    async (messageType: 'text' | 'image', content: string) => {
      if (!inquiryId) return null
      const response = await fetch(`/api/inquiries/${inquiryId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_type: messageType, content }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const message = await response.json()
      // Optimistic update (Realtime will also deliver it, dedupe handles it)
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      return message
    },
    [inquiryId],
  )

  return { messages, isLoading, sendMessage, refetch: fetchMessages }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/queries/messages.ts src/app/api/inquiries/[id]/messages/ src/hooks/useRealtimeMessages.ts
git commit -m "feat: implement messages API, query helpers, and Realtime subscription hook"
```

---

### Task 10: Quote API

**Files:**
- Create: `src/lib/supabase/queries/quotes.ts`
- Modify: `src/app/api/inquiries/[id]/quotes/route.ts`

- [ ] **Step 1: Implement quote query helpers**

```typescript
// src/lib/supabase/queries/quotes.ts
import { z } from 'zod'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { sendSystemMessage } from './messages'
import { updateInquiryStatus } from './inquiries'
import type { Quote, Message } from '@/types/database'

const quoteCreateSchema = z.object({
  price: z.number().int().min(1, 'Price must be positive'),
  note: z.string().max(500).optional(),
  available_dates: z.array(z.string()).max(10).optional(),
})

export function validateQuoteCreate(input: unknown) {
  return quoteCreateSchema.safeParse(input)
}

export async function createQuote(
  inquiryId: string,
  artistId: string,
  senderId: string,
  data: z.infer<typeof quoteCreateSchema>,
): Promise<{ quote: Quote; message: Message }> {
  const admin = createAdminClient()

  // Insert quote record
  const { data: quote, error: quoteError } = await admin
    .from('quotes')
    .insert({
      inquiry_id: inquiryId,
      artist_id: artistId,
      price: data.price,
      note: data.note ?? null,
      available_dates: data.available_dates?.join(', ') ?? null,
    })
    .select()
    .single()

  if (quoteError || !quote) {
    throw new Error(`Failed to create quote: ${quoteError?.message}`)
  }

  // Insert quote message into chat
  const { data: message, error: msgError } = await admin
    .from('messages')
    .insert({
      inquiry_id: inquiryId,
      sender_type: 'artist',
      sender_id: senderId,
      message_type: 'quote',
      content: `報價 NT$${data.price.toLocaleString()}`,
      metadata: {
        quote_id: quote.id,
        price: data.price,
        note: data.note ?? null,
        available_dates: data.available_dates ?? null,
        status: 'sent',
      },
    })
    .select()
    .single()

  if (msgError || !message) {
    throw new Error(`Failed to create quote message: ${msgError?.message}`)
  }

  // Update inquiry status
  await updateInquiryStatus(inquiryId, 'quoted')

  return { quote, message }
}

export async function respondToQuote(
  quoteId: string,
  inquiryId: string,
  status: 'accepted' | 'rejected',
): Promise<Quote> {
  const admin = createAdminClient()

  const { data: quote, error } = await admin
    .from('quotes')
    .update({ status })
    .eq('id', quoteId)
    .select()
    .single()

  if (error || !quote) throw new Error(`Failed to update quote: ${error?.message}`)

  // Add system message
  const statusText = status === 'accepted' ? '已接受報價' : '已拒絕報價'
  await sendSystemMessage(inquiryId, statusText)

  // Update inquiry status if accepted
  if (status === 'accepted') {
    await updateInquiryStatus(inquiryId, 'accepted')
  }

  return quote
}
```

- [ ] **Step 2: Implement quotes API route**

```typescript
// src/app/api/inquiries/[id]/quotes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import { validateQuoteCreate, createQuote, respondToQuote } from '@/lib/supabase/queries/quotes'
import { pushQuoteNotification } from '@/lib/line/messaging'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const validation = validateQuoteCreate(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const inquiry = await getInquiryById(id)
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Only the artist of this inquiry can quote
    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || inquiry.artist_id !== artist.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { quote, message } = await createQuote(
      id,
      artist.id,
      user.lineUserId,
      validation.data,
    )

    // LINE notification to consumer (fire and forget)
    pushQuoteNotification(inquiry, quote, artist.display_name).catch((err) =>
      console.error('Failed to send quote notification:', err),
    )

    return NextResponse.json({ quote, message }, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create quote error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth()
    const { id } = await params
    const body = await request.json()
    const { quote_id, status } = body

    if (!quote_id || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const inquiry = await getInquiryById(id)
    if (!inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    // Only the consumer can respond to quotes
    if (inquiry.consumer_line_id !== user.lineUserId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const quote = await respondToQuote(quote_id, id, status)
    return NextResponse.json(quote)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Respond to quote error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/queries/quotes.ts src/app/api/inquiries/[id]/quotes/route.ts
git commit -m "feat: implement quote API (create quote, accept/reject) with chat integration"
```

---

### Task 11: LINE Push Notification Service

**Files:**
- Create: `src/lib/line/messaging.ts`
- Test: `src/lib/line/__tests__/messaging.test.ts`

- [ ] **Step 1: Install @line/bot-sdk**

Run: `npm install @line/bot-sdk`

- [ ] **Step 2: Write tests for notification helpers**

```typescript
// src/lib/line/__tests__/messaging.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildInquiryNotificationMessage, buildQuoteNotificationMessage } from '../messaging'

describe('buildInquiryNotificationMessage', () => {
  it('truncates long descriptions to 50 chars', () => {
    const msg = buildInquiryNotificationMessage(
      'A'.repeat(100),
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('A'.repeat(47) + '...')
  })

  it('includes deep link to dashboard', () => {
    const msg = buildInquiryNotificationMessage(
      'test description',
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('/artist/dashboard')
  })
})

describe('buildQuoteNotificationMessage', () => {
  it('formats price with NT$ prefix', () => {
    const msg = buildQuoteNotificationMessage(
      'Artist Name',
      5000,
      'http://localhost:3000',
      'inquiry-123',
    )
    const textBody = JSON.stringify(msg)
    expect(textBody).toContain('NT$5,000')
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/line/__tests__/messaging.test.ts`
Expected: FAIL

- [ ] **Step 4: Implement LINE messaging helpers**

```typescript
// src/lib/line/messaging.ts
import { messagingApi } from '@line/bot-sdk'
import type { Inquiry, Quote, Message } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'

function getMessagingClient(): messagingApi.MessagingApiClient {
  return new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN!,
  })
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
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
          { type: 'text', text: '收到新詢價', weight: 'bold', size: 'lg' },
          { type: 'text', text: truncate(description, 50), size: 'sm', color: '#999999', wrap: true },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: { type: 'uri', label: '查看詳情', uri: `${baseUrl}/artist/dashboard?inquiry=${inquiryId}` },
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
    altText: `${artistName} 已報價 NT$${price.toLocaleString()}`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          { type: 'text', text: `${artistName} 已回覆報價`, weight: 'bold', size: 'lg' },
          { type: 'text', text: `NT$${price.toLocaleString()}`, size: 'xl', weight: 'bold', color: '#C8A97E' },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: { type: 'uri', label: '查看報價', uri: `${baseUrl}/inquiries/${inquiryId}` },
            style: 'primary',
            color: '#C8A97E',
          },
        ],
      },
    },
  }
}

export async function pushNewInquiryNotification(inquiry: Inquiry): Promise<void> {
  const admin = createAdminClient()
  const { data: artist } = await admin
    .from('artists')
    .select('line_user_id')
    .eq('id', inquiry.artist_id)
    .single()

  if (!artist?.line_user_id) return

  const client = getMessagingClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const message = buildInquiryNotificationMessage(inquiry.description, baseUrl, inquiry.id)

  await client.pushMessage({ to: artist.line_user_id, messages: [message] })
}

export async function pushQuoteNotification(
  inquiry: Inquiry,
  quote: Quote,
  artistName: string,
): Promise<void> {
  const client = getMessagingClient()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
  const message = buildQuoteNotificationMessage(artistName, quote.price, baseUrl, inquiry.id)

  await client.pushMessage({ to: inquiry.consumer_line_id, messages: [message] })
}

export async function pushNewMessageNotification(
  inquiry: Inquiry,
  message: Message,
  senderType: 'consumer' | 'artist',
  senderName: string,
): Promise<void> {
  const admin = createAdminClient()

  // Determine recipient
  let recipientLineId: string
  if (senderType === 'consumer') {
    const { data: artist } = await admin
      .from('artists')
      .select('line_user_id')
      .eq('id', inquiry.artist_id)
      .single()
    if (!artist?.line_user_id) return
    recipientLineId = artist.line_user_id
  } else {
    recipientLineId = inquiry.consumer_line_id
  }

  const client = getMessagingClient()
  const contentPreview = message.message_type === 'image'
    ? '傳了一張圖片'
    : truncate(message.content ?? '', 50)

  await client.pushMessage({
    to: recipientLineId,
    messages: [{
      type: 'text',
      text: `${senderName}：${contentPreview}`,
    }],
  })
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/line/__tests__/messaging.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/line/messaging.ts src/lib/line/__tests__/messaging.test.ts
git commit -m "feat: add LINE Messaging API push notification service"
```

---

## Phase 3: Artist Dashboard UI

### Task 12: Artist Dashboard Layout + Nav

**Files:**
- Create: `src/app/(artist)/artist/layout.tsx`
- Create: `src/components/artists/ArtistDashboardNav.tsx`
- Modify: `src/app/(artist)/artist/page.tsx`

- [ ] **Step 1: Create dashboard navigation component**

```tsx
// src/components/artists/ArtistDashboardNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, User, Image, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/artist/dashboard', label: '詢價', icon: MessageSquare },
  { href: '/artist/profile', label: '個人檔案', icon: User },
  { href: '/artist/portfolio', label: '作品集', icon: Image },
  { href: '/artist/settings', label: '設定', icon: Settings },
] as const

export function ArtistDashboardNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden lg:flex flex-col w-60 border-r border-[#1F1F1F] bg-[#0A0A0A] p-4 gap-1">
        <div className="px-3 py-4 mb-4">
          <h2 className="text-lg font-semibold text-[#F5F0EB]">刺青師後台</h2>
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-[#1F1F1F] text-[#C8A97E]'
                : 'text-[#F5F0EB]/60 hover:text-[#F5F0EB] hover:bg-[#141414]',
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-[#1F1F1F] bg-[#0A0A0A]">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
              pathname.startsWith(href)
                ? 'text-[#C8A97E]'
                : 'text-[#F5F0EB]/40',
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
```

- [ ] **Step 2: Create artist layout**

```tsx
// src/app/(artist)/artist/layout.tsx
import { ArtistDashboardNav } from '@/components/artists/ArtistDashboardNav'

export default function ArtistLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen bg-[#0A0A0A]">
      <ArtistDashboardNav />
      <main className="flex-1 pb-16 lg:pb-0">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Rewrite artist entry page**

```tsx
// src/app/(artist)/artist/page.tsx
'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { redirect } from 'next/navigation'

export default function ArtistEntryPage() {
  const { isLoading, isLoggedIn, artist, loginWithRedirect } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-[#F5F0EB]/60">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-4 gap-6">
        <h1 className="text-2xl font-semibold text-[#F5F0EB]">刺青師後台</h1>
        <p className="text-[#F5F0EB]/60 text-center max-w-md">
          使用 LINE 登入來管理你的作品集、回覆詢價、接收報價
        </p>
        <Button
          onClick={() => loginWithRedirect('/artist')}
          className="bg-[#06C755] hover:bg-[#06C755]/90 text-white px-8"
          size="lg"
        >
          LINE 登入
        </Button>
      </div>
    )
  }

  if (artist?.status === 'active') {
    redirect('/artist/dashboard')
  }

  if (artist?.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-4 gap-4">
        <h1 className="text-2xl font-semibold text-[#F5F0EB]">申請審核中</h1>
        <p className="text-[#F5F0EB]/60 text-center max-w-md">
          你的刺青師帳號正在審核中，審核通過後即可使用後台功能
        </p>
      </div>
    )
  }

  // No artist record — show application prompt
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-4 gap-6">
      <h1 className="text-2xl font-semibold text-[#F5F0EB]">成為 InkHunt 刺青師</h1>
      <p className="text-[#F5F0EB]/60 text-center max-w-md">
        填寫你的資料，申請成為平台刺青師，展示作品接收詢價
      </p>
      <Button
        onClick={() => redirect('/artist/profile')}
        className="bg-[#C8A97E] hover:bg-[#C8A97E]/90 text-[#0A0A0A] px-8"
        size="lg"
      >
        開始申請
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(artist)/artist/layout.tsx src/app/(artist)/artist/page.tsx src/components/artists/ArtistDashboardNav.tsx
git commit -m "feat: add artist dashboard layout, nav, and entry page with auth flow"
```

---

### Task 13: Chat Components (ChatList + ChatWindow + MessageBubble + QuoteCard + ChatInput)

**Files:**
- Create: `src/components/chat/ChatList.tsx`
- Create: `src/components/chat/ChatWindow.tsx`
- Create: `src/components/chat/MessageBubble.tsx`
- Create: `src/components/chat/QuoteCard.tsx`
- Create: `src/components/chat/ChatInput.tsx`
- Modify: `src/app/(artist)/artist/dashboard/page.tsx`

- [ ] **Step 1: Create MessageBubble component**

```tsx
// src/components/chat/MessageBubble.tsx
import { cn } from '@/lib/utils'
import type { Message } from '@/types/database'
import { QuoteCard } from './QuoteCard'

interface MessageBubbleProps {
  readonly message: Message
  readonly isOwn: boolean
  readonly onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
}

export function MessageBubble({ message, isOwn, onQuoteAction }: MessageBubbleProps) {
  if (message.message_type === 'system') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-xs text-[#F5F0EB]/40 bg-[#1F1F1F] px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    )
  }

  if (message.message_type === 'quote') {
    const metadata = message.metadata as Record<string, unknown>
    return (
      <div className={cn('flex py-1', isOwn ? 'justify-end' : 'justify-start')}>
        <QuoteCard
          quoteId={metadata.quote_id as string}
          price={metadata.price as number}
          note={metadata.note as string | null}
          availableDates={metadata.available_dates as string[] | null}
          status={metadata.status as string}
          isOwn={isOwn}
          onAction={onQuoteAction}
        />
      </div>
    )
  }

  return (
    <div className={cn('flex py-1', isOwn ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5',
          isOwn
            ? 'bg-[#C8A97E] text-[#0A0A0A]'
            : 'bg-[#1F1F1F] text-[#F5F0EB]',
        )}
      >
        {message.message_type === 'image' ? (
          <img
            src={message.content ?? ''}
            alt="Shared image"
            className="rounded-lg max-w-full max-h-64 object-cover"
            loading="lazy"
          />
        ) : (
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        )}
        <time className={cn(
          'text-[10px] mt-1 block',
          isOwn ? 'text-[#0A0A0A]/50' : 'text-[#F5F0EB]/30',
        )}>
          {new Date(message.created_at).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </time>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create QuoteCard component**

```tsx
// src/components/chat/QuoteCard.tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface QuoteCardProps {
  readonly quoteId: string
  readonly price: number
  readonly note: string | null
  readonly availableDates: string[] | null
  readonly status: string
  readonly isOwn: boolean
  readonly onAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
}

export function QuoteCard({
  quoteId,
  price,
  note,
  availableDates,
  status,
  isOwn,
  onAction,
}: QuoteCardProps) {
  const showActions = !isOwn && status === 'sent'
  const statusLabels: Record<string, string> = {
    sent: '等待回應',
    viewed: '已讀',
    accepted: '已接受',
    rejected: '已拒絕',
  }

  return (
    <div className="max-w-[80%] bg-[#1F1F1F] border border-[#C8A97E]/30 rounded-xl p-4 space-y-3">
      <div className="text-xs text-[#C8A97E] font-medium uppercase tracking-wider">
        報價
      </div>
      <div className="text-2xl font-bold text-[#F5F0EB]">
        NT${price.toLocaleString()}
      </div>
      {note && (
        <p className="text-sm text-[#F5F0EB]/70">{note}</p>
      )}
      {availableDates && availableDates.length > 0 && (
        <div className="text-xs text-[#F5F0EB]/50">
          可預約：{availableDates.join(', ')}
        </div>
      )}
      {showActions ? (
        <div className="flex gap-2 pt-2">
          <Button
            onClick={() => onAction?.(quoteId, 'accepted')}
            className="flex-1 bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#C8A97E]/90"
            size="sm"
          >
            接受
          </Button>
          <Button
            onClick={() => onAction?.(quoteId, 'rejected')}
            variant="outline"
            className="flex-1 border-[#F5F0EB]/20 text-[#F5F0EB]"
            size="sm"
          >
            拒絕
          </Button>
        </div>
      ) : (
        <div className={cn(
          'text-xs font-medium',
          status === 'accepted' ? 'text-green-500' : status === 'rejected' ? 'text-red-400' : 'text-[#F5F0EB]/40',
        )}>
          {statusLabels[status] ?? status}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create ChatInput component**

```tsx
// src/components/chat/ChatInput.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { Send, Image, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ChatInputProps {
  readonly onSendMessage: (type: 'text' | 'image', content: string) => void
  readonly onSendQuote?: () => void
  readonly isArtist: boolean
  readonly disabled?: boolean
}

export function ChatInput({ onSendMessage, onSendQuote, isArtist, disabled }: ChatInputProps) {
  const [text, setText] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSendMessage('text', trimmed)
    setText('')
  }, [text, onSendMessage])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend],
  )

  const handleImageSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      // Get signed URL and upload
      try {
        const signedUrlRes = await fetch('/api/upload/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bucket: 'inquiries',
            filename: file.name,
            content_type: file.type,
          }),
        })

        if (!signedUrlRes.ok) throw new Error('Failed to get upload URL')
        const { signed_url, public_url } = await signedUrlRes.json()

        await fetch(signed_url, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        onSendMessage('image', public_url)
      } catch (err) {
        console.error('Image upload failed:', err)
      }

      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [onSendMessage],
  )

  return (
    <div className="flex items-center gap-2 p-3 border-t border-[#1F1F1F] bg-[#0A0A0A]">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleImageSelect}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        className="text-[#F5F0EB]/40 hover:text-[#F5F0EB]"
        disabled={disabled}
      >
        <Image className="w-5 h-5" />
      </Button>
      {isArtist && onSendQuote && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSendQuote}
          className="text-[#C8A97E]/60 hover:text-[#C8A97E]"
          disabled={disabled}
        >
          <DollarSign className="w-5 h-5" />
        </Button>
      )}
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="輸入訊息..."
        className="flex-1 bg-[#141414] border-[#1F1F1F] text-[#F5F0EB] placeholder:text-[#F5F0EB]/30"
        disabled={disabled}
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="text-[#C8A97E] hover:text-[#C8A97E]/80"
      >
        <Send className="w-5 h-5" />
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Create ChatList component**

```tsx
// src/components/chat/ChatList.tsx
'use client'

import { cn } from '@/lib/utils'
import type { Inquiry } from '@/types/database'

interface ChatListItem {
  inquiry: Inquiry
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

interface ChatListProps {
  readonly items: ChatListItem[]
  readonly selectedId: string | null
  readonly onSelect: (id: string) => void
  readonly viewAs: 'artist' | 'consumer'
}

export function ChatList({ items, selectedId, onSelect, viewAs }: ChatListProps) {
  return (
    <div className="flex flex-col overflow-y-auto">
      {items.length === 0 && (
        <div className="p-8 text-center text-[#F5F0EB]/40 text-sm">
          還沒有任何對話
        </div>
      )}
      {items.map((item) => {
        const displayName = viewAs === 'artist'
          ? (item.consumer_name ?? '消費者')
          : item.artist_display_name
        const isSelected = selectedId === item.inquiry.id

        return (
          <button
            key={item.inquiry.id}
            onClick={() => onSelect(item.inquiry.id)}
            className={cn(
              'flex items-center gap-3 p-4 text-left transition-colors border-b border-[#1F1F1F]',
              isSelected
                ? 'bg-[#1F1F1F]'
                : 'hover:bg-[#141414]',
            )}
          >
            <div className="w-10 h-10 rounded-full bg-[#1F1F1F] flex items-center justify-center text-[#F5F0EB]/60 text-sm font-medium shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#F5F0EB] truncate">
                  {displayName}
                </span>
                {item.last_message_at && (
                  <span className="text-[10px] text-[#F5F0EB]/30 shrink-0">
                    {new Date(item.last_message_at).toLocaleDateString('zh-TW', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#F5F0EB]/40 truncate mt-0.5">
                {item.last_message ?? item.inquiry.description}
              </p>
            </div>
            {item.unread_count > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#C8A97E] text-[#0A0A0A] text-[10px] font-bold flex items-center justify-center shrink-0">
                {item.unread_count > 9 ? '9+' : item.unread_count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 5: Create ChatWindow component**

```tsx
// src/components/chat/ChatWindow.tsx
'use client'

import { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'

interface ChatWindowProps {
  readonly inquiryId: string
  readonly currentUserId: string
  readonly isArtist: boolean
  readonly onSendQuote?: () => void
  readonly onQuoteAction?: (quoteId: string, action: 'accepted' | 'rejected') => void
}

export function ChatWindow({
  inquiryId,
  currentUserId,
  isArtist,
  onSendQuote,
  onQuoteAction,
}: ChatWindowProps) {
  const { messages, isLoading, sendMessage } = useRealtimeMessages(inquiryId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
            onQuoteAction={onQuoteAction}
          />
        ))}
      </div>
      <ChatInput
        onSendMessage={sendMessage}
        onSendQuote={onSendQuote}
        isArtist={isArtist}
      />
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/
git commit -m "feat: add chat UI components (ChatList, ChatWindow, MessageBubble, QuoteCard, ChatInput)"
```

---

### Task 14: Artist Dashboard Page (Chat Integration)

**Files:**
- Modify: `src/app/(artist)/artist/dashboard/page.tsx`

- [ ] **Step 1: Implement dashboard page with chat**

```tsx
// src/app/(artist)/artist/dashboard/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'

interface InquiryListItem {
  inquiry: {
    id: string
    artist_id: string
    consumer_line_id: string
    consumer_name: string | null
    description: string
    body_part: string | null
    status: string
    created_at: string
  }
  artist_display_name: string
  artist_avatar_url: string | null
  consumer_name: string | null
  last_message: string | null
  last_message_at: string | null
  unread_count: number
}

export default function DashboardPage() {
  const { user, artist } = useAuth()
  const [inquiries, setInquiries] = useState<InquiryListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchInquiries = useCallback(async () => {
    try {
      const response = await fetch('/api/inquiries?role=artist')
      const data = await response.json()
      // Transform response to ChatList format
      setInquiries(
        (data.data ?? []).map((inq: any) => ({
          inquiry: inq,
          artist_display_name: '',
          artist_avatar_url: null,
          consumer_name: inq.consumer_name,
          last_message: null,
          last_message_at: null,
          unread_count: 0,
        })),
      )
    } catch (err) {
      console.error('Failed to fetch inquiries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInquiries()
  }, [fetchInquiries])

  const handleSendQuote = useCallback(() => {
    // TODO: Open quote dialog — will implement with a Sheet/Dialog
  }, [])

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      if (!selectedId) return
      await fetch(`/api/inquiries/${selectedId}/quotes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: action }),
      })
    },
    [selectedId],
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-[#0A0A0A]">
      {/* Chat list */}
      <div className={`${selectedId ? 'hidden lg:flex' : 'flex'} flex-col w-full lg:w-80 border-r border-[#1F1F1F]`}>
        <div className="p-4 border-b border-[#1F1F1F]">
          <h1 className="text-lg font-semibold text-[#F5F0EB]">詢價管理</h1>
        </div>
        <ChatList
          items={inquiries}
          selectedId={selectedId}
          onSelect={setSelectedId}
          viewAs="artist"
        />
      </div>

      {/* Chat window */}
      <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} flex-1 flex-col`}>
        {selectedId && user ? (
          <>
            {/* Mobile back button */}
            <div className="lg:hidden flex items-center p-3 border-b border-[#1F1F1F]">
              <button
                onClick={() => setSelectedId(null)}
                className="text-[#F5F0EB]/60 text-sm"
              >
                ← 返回
              </button>
            </div>
            <ChatWindow
              inquiryId={selectedId}
              currentUserId={user.lineUserId}
              isArtist={true}
              onSendQuote={handleSendQuote}
              onQuoteAction={handleQuoteAction}
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-[#F5F0EB]/30">
            選擇一個對話開始聊天
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(artist)/artist/dashboard/page.tsx
git commit -m "feat: implement artist dashboard page with chat list and chat window"
```

---

### Task 15: Artist Profile Editor

**Files:**
- Create: `src/components/artists/ProfileForm.tsx`
- Modify: `src/app/(artist)/artist/profile/page.tsx`

- [ ] **Step 1: Create ProfileForm component**

```tsx
// src/components/artists/ProfileForm.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import type { Artist, Style } from '@/types/database'

interface ProfileFormProps {
  readonly artist: Artist | null
  readonly styles: Style[]
  readonly selectedStyleIds: number[]
}

interface FormState {
  display_name: string
  bio: string
  city: string
  district: string
  address: string
  price_min: string
  price_max: string
  ig_handle: string
  pricing_note: string
  booking_notice: string
  style_ids: number[]
}

export function ProfileForm({ artist, styles, selectedStyleIds }: ProfileFormProps) {
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState<FormState>({
    display_name: artist?.display_name ?? '',
    bio: artist?.bio ?? '',
    city: artist?.city ?? '',
    district: artist?.district ?? '',
    address: artist?.address ?? '',
    price_min: artist?.price_min?.toString() ?? '',
    price_max: artist?.price_max?.toString() ?? '',
    ig_handle: artist?.ig_handle ?? '',
    pricing_note: artist?.pricing_note ?? '',
    booking_notice: artist?.booking_notice ?? '',
    style_ids: selectedStyleIds,
  })

  const handleChange = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage(null)
  }, [])

  const toggleStyle = useCallback((styleId: number) => {
    setForm((prev) => ({
      ...prev,
      style_ids: prev.style_ids.includes(styleId)
        ? prev.style_ids.filter((id) => id !== styleId)
        : [...prev.style_ids, styleId],
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const endpoint = artist ? `/api/artists/${artist.slug}` : '/api/artists'
      const method = artist ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          bio: form.bio || null,
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          price_min: form.price_min ? Number(form.price_min) : null,
          price_max: form.price_max ? Number(form.price_max) : null,
          ig_handle: form.ig_handle || null,
          pricing_note: form.pricing_note || null,
          booking_notice: form.booking_notice || null,
          style_ids: form.style_ids,
        }),
      })

      if (!response.ok) throw new Error('Save failed')
      setMessage({ type: 'success', text: artist ? '已儲存' : '申請已送出，等待審核' })
    } catch {
      setMessage({ type: 'error', text: '儲存失敗，請重試' })
    } finally {
      setIsSaving(false)
    }
  }, [artist, form])

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
      className="space-y-6 max-w-2xl"
    >
      {/* Display Name */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">
          顯示名稱 <span className="text-red-500">*</span>
        </label>
        <Input
          value={form.display_name}
          onChange={(e) => handleChange('display_name', e.target.value)}
          className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]"
          required
        />
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">自我介紹</label>
        <Textarea
          value={form.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB] min-h-24"
          placeholder="介紹你的風格、經歷、理念..."
        />
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#F5F0EB]">
            城市 <span className="text-red-500">*</span>
          </label>
          <Input
            value={form.city}
            onChange={(e) => handleChange('city', e.target.value)}
            className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]"
            placeholder="台北市"
            required
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#F5F0EB]">區域</label>
          <Input
            value={form.district}
            onChange={(e) => handleChange('district', e.target.value)}
            className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]"
            placeholder="大安區"
          />
        </div>
      </div>

      {/* Price Range */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">價格範圍 (NTD)</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={form.price_min}
            onChange={(e) => handleChange('price_min', e.target.value)}
            className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]"
            placeholder="最低"
            min={0}
          />
          <span className="text-[#F5F0EB]/40">~</span>
          <Input
            type="number"
            value={form.price_max}
            onChange={(e) => handleChange('price_max', e.target.value)}
            className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]"
            placeholder="最高"
            min={0}
          />
        </div>
      </div>

      {/* IG Handle */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">Instagram</label>
        <Input
          value={form.ig_handle}
          onChange={(e) => handleChange('ig_handle', e.target.value)}
          className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]"
          placeholder="@yourtattoo"
        />
      </div>

      {/* Styles */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">擅長風格</label>
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => toggleStyle(style.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                form.style_ids.includes(style.id)
                  ? 'bg-[#C8A97E] text-[#0A0A0A]'
                  : 'bg-[#1F1F1F] text-[#F5F0EB]/60 hover:text-[#F5F0EB]'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      {message && (
        <div className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
          {message.text}
        </div>
      )}
      <Button
        type="submit"
        disabled={isSaving}
        className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#C8A97E]/90 px-8"
      >
        {isSaving ? '儲存中...' : (artist ? '儲存' : '提交申請')}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Implement profile page**

```tsx
// src/app/(artist)/artist/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ProfileForm } from '@/components/artists/ProfileForm'
import type { Artist, Style } from '@/types/database'

export default function ProfilePage() {
  const { user, artist: authArtist } = useAuth()
  const [artist, setArtist] = useState<Artist | null>(null)
  const [styles, setStyles] = useState<Style[]>([])
  const [selectedStyleIds, setSelectedStyleIds] = useState<number[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch all styles
        const stylesRes = await fetch('/api/styles')
        if (stylesRes.ok) {
          const stylesData = await stylesRes.json()
          setStyles(stylesData.data ?? stylesData ?? [])
        }

        // Fetch artist profile if exists
        if (authArtist?.slug) {
          const artistRes = await fetch(`/api/artists/${authArtist.slug}`)
          if (artistRes.ok) {
            const artistData = await artistRes.json()
            setArtist(artistData)
            setSelectedStyleIds(artistData.styles?.map((s: Style) => s.id) ?? [])
          }
        }
      } catch (err) {
        console.error('Failed to load profile data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [authArtist?.slug])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10">
      <h1 className="text-2xl font-semibold text-[#F5F0EB] mb-8">
        {artist ? '編輯個人檔案' : '申請成為刺青師'}
      </h1>
      <ProfileForm
        artist={artist}
        styles={styles}
        selectedStyleIds={selectedStyleIds}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/artists/ProfileForm.tsx src/app/(artist)/artist/profile/page.tsx
git commit -m "feat: implement artist profile editor with style tags and form validation"
```

---

### Task 16: Artist Portfolio Management

**Files:**
- Create: `src/components/artists/PortfolioGrid.tsx`
- Create: `src/components/artists/PortfolioUploader.tsx`
- Modify: `src/app/(artist)/artist/portfolio/page.tsx`

- [ ] **Step 1: Create PortfolioUploader component**

```tsx
// src/components/artists/PortfolioUploader.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface PortfolioUploaderProps {
  readonly onUpload: (urls: string[]) => void
  readonly disabled?: boolean
}

export function PortfolioUploader({ onUpload, disabled }: PortfolioUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = useCallback(
    async (files: FileList) => {
      setIsUploading(true)
      const urls: string[] = []
      const total = files.length

      for (let i = 0; i < total; i++) {
        const file = files[i]
        try {
          const signedRes = await fetch('/api/upload/signed-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bucket: 'portfolio',
              filename: file.name,
              content_type: file.type,
            }),
          })

          if (!signedRes.ok) throw new Error('Failed to get upload URL')
          const { signed_url, public_url } = await signedRes.json()

          await fetch(signed_url, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })

          urls.push(public_url)
          setProgress(((i + 1) / total) * 100)
        } catch (err) {
          console.error(`Upload failed for ${file.name}:`, err)
        }
      }

      setIsUploading(false)
      setProgress(0)
      if (urls.length > 0) onUpload(urls)
      if (inputRef.current) inputRef.current.value = ''
    },
    [onUpload],
  )

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={disabled || isUploading}
        className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#C8A97E]/90"
      >
        <Upload className="w-4 h-4 mr-2" />
        {isUploading ? `上傳中 ${Math.round(progress)}%` : '上傳作品'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Create PortfolioGrid component**

```tsx
// src/components/artists/PortfolioGrid.tsx
'use client'

import { useState, useCallback } from 'react'
import { Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PortfolioItem } from '@/types/database'

interface PortfolioGridProps {
  readonly items: PortfolioItem[]
  readonly onDelete: (id: string) => void
  readonly onEdit: (item: PortfolioItem) => void
}

export function PortfolioGrid({ items, onDelete, onEdit }: PortfolioGridProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id)
      onDelete(id)
      setDeletingId(null)
    },
    [onDelete],
  )

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-[#F5F0EB]/40">
        還沒有任何作品，點擊上方按鈕開始上傳
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {items.map((item) => (
        <div key={item.id} className="group relative aspect-square rounded-lg overflow-hidden bg-[#141414]">
          <img
            src={item.image_url}
            alt={item.title ?? 'Portfolio item'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <Button
              size="icon"
              variant="ghost"
              className="text-white hover:bg-white/20"
              onClick={() => onEdit(item)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-red-400 hover:bg-red-400/20"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          {item.title && (
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
              <p className="text-xs text-white truncate">{item.title}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Implement portfolio page**

```tsx
// src/app/(artist)/artist/portfolio/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { PortfolioGrid } from '@/components/artists/PortfolioGrid'
import { PortfolioUploader } from '@/components/artists/PortfolioUploader'
import type { PortfolioItem } from '@/types/database'

export default function PortfolioPage() {
  const { artist } = useAuth()
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      if (!artist?.slug) return
      try {
        const res = await fetch(`/api/artists/${artist.slug}/portfolio`)
        if (res.ok) {
          const data = await res.json()
          setItems(data.data ?? data ?? [])
        }
      } catch (err) {
        console.error('Failed to load portfolio:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [artist?.slug])

  const handleUpload = useCallback(
    async (urls: string[]) => {
      if (!artist) return
      // Create portfolio items for each uploaded image
      for (const url of urls) {
        try {
          const res = await fetch(`/api/artists/${artist.slug}/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url: url }),
          })
          if (res.ok) {
            const newItem = await res.json()
            setItems((prev) => [...prev, newItem])
          }
        } catch (err) {
          console.error('Failed to create portfolio item:', err)
        }
      }
    },
    [artist],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      if (!artist) return
      try {
        await fetch(`/api/artists/${artist.slug}/portfolio/${id}`, { method: 'DELETE' })
        setItems((prev) => prev.filter((item) => item.id !== id))
      } catch (err) {
        console.error('Failed to delete portfolio item:', err)
      }
    },
    [artist],
  )

  const handleEdit = useCallback((item: PortfolioItem) => {
    // TODO: Open edit dialog (Task for Batch 2 refinement)
    console.log('Edit item:', item.id)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-10 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#F5F0EB]">作品集管理</h1>
        <PortfolioUploader onUpload={handleUpload} />
      </div>
      <p className="text-sm text-[#F5F0EB]/40">{items.length} 件作品</p>
      <PortfolioGrid items={items} onDelete={handleDelete} onEdit={handleEdit} />
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/artists/PortfolioGrid.tsx src/components/artists/PortfolioUploader.tsx src/app/(artist)/artist/portfolio/page.tsx
git commit -m "feat: implement artist portfolio management with upload, grid, and delete"
```

---

## Phase 3.5: Artist API Routes (Profile + Portfolio CRUD)

### Task 15.5: Implement Artist Profile + Portfolio API Routes

The existing API routes at `/api/artists`, `/api/artists/[slug]`, and `/api/artists/[slug]/portfolio` are TODO stubs. The profile editor (Task 15) and portfolio management (Task 16) depend on them.

**Files:**
- Modify: `src/app/api/artists/route.ts`
- Modify: `src/app/api/artists/[slug]/route.ts`
- Modify: `src/app/api/artists/[slug]/portfolio/route.ts`

- [ ] **Step 1: Implement POST /api/artists (create artist application)**

```typescript
// src/app/api/artists/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/helpers'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createArtistSchema = z.object({
  display_name: z.string().min(1).max(100),
  bio: z.string().max(1000).nullable().optional(),
  city: z.string().min(1),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  price_min: z.number().int().min(0).nullable().optional(),
  price_max: z.number().int().min(0).nullable().optional(),
  ig_handle: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  booking_notice: z.string().nullable().optional(),
  style_ids: z.array(z.number()).default([]),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const validation = createArtistSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const admin = createAdminClient()
    const { style_ids, ...artistData } = validation.data

    // Generate slug from display_name
    const slug = artistData.display_name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now().toString(36)

    const { data: artist, error } = await admin
      .from('artists')
      .insert({
        ...artistData,
        slug,
        line_user_id: user.lineUserId,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Insert style associations
    if (style_ids.length > 0) {
      await admin
        .from('artist_styles')
        .insert(style_ids.map((style_id) => ({ artist_id: artist.id, style_id })))
    }

    return NextResponse.json(artist, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create artist error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  // Keep existing list artists logic or implement with real Supabase
  return NextResponse.json({ message: 'TODO - migrate from mock data' })
}
```

- [ ] **Step 2: Implement PATCH /api/artists/[slug] (update profile)**

```typescript
// src/app/api/artists/[slug]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateArtistSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  bio: z.string().max(1000).nullable().optional(),
  city: z.string().min(1).optional(),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  price_min: z.number().int().min(0).nullable().optional(),
  price_max: z.number().int().min(0).nullable().optional(),
  ig_handle: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  booking_notice: z.string().nullable().optional(),
  style_ids: z.array(z.number()).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServerClient()

  const { data: artist, error } = await supabase
    .from('artists')
    .select('*, artist_styles(style_id, styles(*))')
    .eq('slug', slug)
    .single()

  if (error || !artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  }

  const styles = (artist.artist_styles as any[])?.map((as: any) => as.styles) ?? []
  return NextResponse.json({ ...artist, styles, artist_styles: undefined })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug } = await params
    const body = await request.json()
    const validation = updateArtistSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    // Verify ownership
    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || artist.slug !== slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { style_ids, ...updateData } = validation.data

    // Update artist
    const { data: updated, error } = await admin
      .from('artists')
      .update(updateData)
      .eq('id', artist.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Update styles if provided
    if (style_ids !== undefined) {
      await admin.from('artist_styles').delete().eq('artist_id', artist.id)
      if (style_ids.length > 0) {
        await admin
          .from('artist_styles')
          .insert(style_ids.map((style_id) => ({ artist_id: artist.id, style_id })))
      }
    }

    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Update artist error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Implement /api/artists/[slug]/portfolio (CRUD)**

```typescript
// src/app/api/artists/[slug]/portfolio/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, getArtistForUser } from '@/lib/auth/helpers'
import { createServerClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createPortfolioSchema = z.object({
  image_url: z.string().url(),
  thumbnail_url: z.string().url().nullable().optional(),
  title: z.string().max(200).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  body_part: z.string().nullable().optional(),
  size_cm: z.string().nullable().optional(),
  style_id: z.number().nullable().optional(),
  healed_image_url: z.string().url().nullable().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const supabase = await createServerClient()

  // Get artist ID from slug
  const { data: artist } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!artist) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('artist_id', artist.id)
    .order('sort_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireAuth()
    const { slug } = await params
    const body = await request.json()
    const validation = createPortfolioSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 },
      )
    }

    const artist = await getArtistForUser(user.lineUserId)
    if (!artist || artist.slug !== slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = createAdminClient()

    // Get max sort_order
    const { data: maxOrder } = await admin
      .from('portfolio_items')
      .select('sort_order')
      .eq('artist_id', artist.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    const nextOrder = (maxOrder?.sort_order ?? -1) + 1

    const { data, error } = await admin
      .from('portfolio_items')
      .insert({
        artist_id: artist.id,
        ...validation.data,
        sort_order: nextOrder,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Create portfolio item error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/artists/
git commit -m "feat: implement artist profile CRUD and portfolio management API routes"
```

---

## Phase 4: Consumer Side + Integration

### Task 17: Consumer Chat Pages

**Files:**
- Create: `src/app/(public)/inquiries/page.tsx`
- Create: `src/app/(public)/inquiries/[id]/page.tsx`

- [ ] **Step 1: Create consumer chat list page**

```tsx
// src/app/(public)/inquiries/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ChatList } from '@/components/chat/ChatList'

export default function ConsumerInquiriesPage() {
  const { isLoggedIn, isLoading: authLoading, loginWithRedirect } = useAuth()
  const router = useRouter()
  const [inquiries, setInquiries] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!isLoggedIn) {
      loginWithRedirect('/inquiries')
      return
    }

    async function load() {
      try {
        const res = await fetch('/api/inquiries?role=consumer')
        const data = await res.json()
        setInquiries(
          (data.data ?? []).map((inq: any) => ({
            inquiry: inq,
            artist_display_name: inq.artist_display_name ?? '刺青師',
            artist_avatar_url: inq.artist_avatar_url ?? null,
            consumer_name: null,
            last_message: null,
            last_message_at: null,
            unread_count: 0,
          })),
        )
      } catch (err) {
        console.error('Failed to load inquiries:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [isLoggedIn, authLoading, loginWithRedirect])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <div className="max-w-lg mx-auto">
        <div className="p-4 border-b border-[#1F1F1F]">
          <h1 className="text-lg font-semibold text-[#F5F0EB]">我的詢價</h1>
        </div>
        <ChatList
          items={inquiries}
          selectedId={null}
          onSelect={(id) => router.push(`/inquiries/${id}`)}
          viewAs="consumer"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create consumer chat window page**

```tsx
// src/app/(public)/inquiries/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { ArrowLeft } from 'lucide-react'

export default function ConsumerChatPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user, isLoggedIn, isLoading: authLoading } = useAuth()
  const [artistName, setArtistName] = useState('')

  useEffect(() => {
    if (!id) return
    async function loadInquiry() {
      try {
        const res = await fetch(`/api/inquiries/${id}`)
        if (res.ok) {
          const data = await res.json()
          setArtistName(data.artist?.display_name ?? '刺青師')
        }
      } catch (err) {
        console.error('Failed to load inquiry:', err)
      }
    }
    loadInquiry()
  }, [id])

  const handleQuoteAction = useCallback(
    async (quoteId: string, action: 'accepted' | 'rejected') => {
      await fetch(`/api/inquiries/${id}/quotes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quote_id: quoteId, status: action }),
      })
    },
    [id],
  )

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A] text-[#F5F0EB]/40">
        Loading...
      </div>
    )
  }

  if (!isLoggedIn || !user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen bg-[#0A0A0A]">
      <div className="flex items-center gap-3 p-4 border-b border-[#1F1F1F]">
        <button onClick={() => router.push('/inquiries')} className="text-[#F5F0EB]/60">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-[#F5F0EB]">{artistName}</h1>
      </div>
      <ChatWindow
        inquiryId={id}
        currentUserId={user.lineUserId}
        isArtist={false}
        onQuoteAction={handleQuoteAction}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(public)/inquiries/
git commit -m "feat: add consumer chat list and chat window pages"
```

---

### Task 18: Wire InquiryForm to Auth + Real API

**Files:**
- Modify: `src/components/inquiry/InquiryForm.tsx`

- [ ] **Step 1: Update InquiryForm to use auth and real API**

Replace the `handleSubmit` function and add auth integration:

In `src/components/inquiry/InquiryForm.tsx`, change the import section to add:
```typescript
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
```

Add to the component body before `handleSubmit`:
```typescript
const { isLoggedIn, loginWithRedirect } = useAuth()
const router = useRouter()
```

Replace `handleSubmit`:
```typescript
const handleSubmit = useCallback(async () => {
  if (!isLoggedIn) {
    loginWithRedirect(window.location.pathname)
    return
  }

  const parsed = inquirySchema.safeParse({
    description: form.description,
    body_part: form.body_part,
    size_estimate: form.size_estimate,
    budget_min: form.budget_min ? Number(form.budget_min) : undefined,
    budget_max: form.budget_max ? Number(form.budget_max) : undefined,
    reference_images: [],
  })

  if (!parsed.success) {
    setErrors(flattenZodErrors(parsed.error))
    return
  }

  setErrors({})

  try {
    const response = await fetch('/api/inquiries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        artist_id: artistId,
        ...parsed.data,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error ?? 'Failed to create inquiry')
    }

    const { id } = await response.json()
    setForm(INITIAL_FORM)
    onOpenChange(false)
    router.push(`/inquiries/${id}`)
  } catch (err) {
    setErrors({ _form: err instanceof Error ? err.message : 'Something went wrong' })
  }
}, [form, onOpenChange, isLoggedIn, loginWithRedirect, artistId, router])
```

Also add `artistId: string` to `InquiryFormProps`.

- [ ] **Step 2: Update InquiryForm props in usage sites**

Find all places that render `<InquiryForm>` and add `artistId={artist.id}` prop.

- [ ] **Step 3: Commit**

```bash
git add src/components/inquiry/InquiryForm.tsx
git commit -m "feat: wire InquiryForm to auth and real inquiry API with redirect to chat"
```

---

## Verification

### Task 19: Integration Smoke Test

- [ ] **Step 1: Verify build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Verify tests pass**

Run: `npm run test:unit`
Expected: All tests pass

- [ ] **Step 3: Verify dev server starts**

Run: `npm run dev`
Expected: Server starts on localhost:3000, no console errors

- [ ] **Step 4: Manual smoke test checklist**

Check these pages load without errors:
- [ ] `/` — Home page
- [ ] `/artists` — Artist list
- [ ] `/artist` — Shows login button (not logged in)
- [ ] `/artist/dashboard` — Redirects to LINE login
- [ ] `/api/auth/me` — Returns `{ user: null, artist: null }`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: verify build and smoke test pass for auth + dashboard + chat"
```
