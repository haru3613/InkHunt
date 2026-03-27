# Design Spec: LINE Login + Artist Dashboard + Chat + Inquiry API

**Date**: 2026-03-27
**Status**: Approved
**Scope**: Features 4/5/6 from MVP roadmap

---

## 1. Decisions

| Question | Decision |
|----------|----------|
| LINE Login flow | LIFF + OAuth Web (OAuth Web first) |
| Identity model | Single LINE Login, consumer default, artist by application + admin approval |
| Artist dashboard scope | Full-featured (C), delivered in 2 batches |
| LINE notifications | Bidirectional (new inquiry → artist, new quote/message → consumer) |
| Image upload | Supabase Storage signed URL direct upload |
| Communication | In-app chat, inquiry = chat room, Supabase Realtime |
| Auth architecture | Supabase Auth + `signInWithIdToken` with LINE ID token |
| Chat tech | Supabase Realtime postgres_changes on `messages` table |
| Chat trigger | Inquiry form → first message, all comms continue in chat |

---

## 2. LINE Login + Supabase Auth

### 2.1 OAuth Web Flow

```
User clicks "LINE Login"
  → redirect to LINE authorize URL
    (response_type=code, scope=profile+openid+email, state, nonce)
  → LINE login success → redirect to /api/auth/line/callback?code=xxx&state=xxx
  → callback exchanges code for tokens via LINE token API
  → extracts ID token (JWT signed by LINE)
  → calls supabase.auth.signInWithIdToken({ provider: custom OIDC, idToken, nonce })
  → Supabase validates ID token against LINE JWKS
  → Supabase creates/updates auth.users record
  → session cookie set → redirect to original page
```

### 2.2 LIFF Flow

```
User opens LIFF URL inside LINE app
  → liff.init({ liffId })
  → liff.getIDToken() returns LINE ID token
  → frontend calls supabase.auth.signInWithIdToken({ provider, idToken })
  → session established client-side
```

### 2.3 Supabase Configuration

Two possible paths (decide during implementation based on Supabase's current OIDC support):

**Path A — Custom OIDC Provider (preferred if supported):**
- Enable custom OIDC provider in Supabase Dashboard
- Issuer: `https://access.line.me`
- Client ID: LINE Channel ID
- JWKS: `https://api.line.me/oauth2/v2.1/certs`

**Path B — Manual token verification + `signInWithIdToken`:**
- Verify LINE ID token manually in callback (check signature via LINE JWKS, validate claims)
- Call `supabase.auth.admin.createUser()` or `signInWithIdToken()` with verified claims
- Needed if LINE's OIDC compliance is insufficient for Supabase's built-in validation

Both paths result in the same outcome: Supabase session with LINE user ID as subject.
User metadata: LINE display_name, picture_url stored in `raw_user_meta_data`.

### 2.4 Identity & Roles

- All users start as consumers (only `auth.users` record)
- Artist application: fill profile form → creates `artists` record with `status = 'pending'`
- Admin approval: sets `status = 'active'`
- Identity check: query `artists` table for matching `line_user_id` + `status = 'active'`
- No separate roles table needed

### 2.5 Route Protection (middleware.ts)

| Route Pattern | Requirement |
|---------------|-------------|
| `/artist/*` | Logged in + `artists.status = 'active'` |
| `/admin/*` | Logged in + admin check (env var allowlist) |
| `POST /api/inquiries` | Logged in (consumer) |
| `POST /api/inquiries/*/quotes` | Logged in + is inquiry's artist |
| `POST /api/inquiries/*/messages` | Logged in + is inquiry participant |
| Everything else | Public |

### 2.6 Dependencies

- `@line/liff` — LIFF SDK (frontend, LIFF flow)
- `@line/bot-sdk` — LINE Messaging API (backend push notifications)

---

## 3. Artist Dashboard

### 3.1 Page Structure

| Route | Page | Batch |
|-------|------|-------|
| `/artist` | Entry: login / pending / redirect to dashboard | 1 |
| `/artist/dashboard` | Chat list + chat window (inquiry management) | 1 |
| `/artist/profile` | Edit profile + style tags + live preview | 1 |
| `/artist/portfolio` | Portfolio CRUD + image upload | 1 |
| `/artist/calendar` | Availability calendar | 2 |
| `/artist/clients` | CRM (consumer history) | 2 |
| `/artist/settings` | Auto-reply templates + account settings | 2 |
| `/artist/stats` | Analytics (views, inquiries, conversion) | 2 |

### 3.2 Layout

- `(artist)` route group with dedicated layout
- Desktop: sidebar nav (dashboard, profile, portfolio, ...)
- Mobile: bottom tab bar
- Header: artist name + avatar
- Auth guard at middleware level

### 3.3 Batch 1: Dashboard (Chat + Inquiry Management)

**Chat List (left panel / mobile list view):**
- All conversations sorted by latest message
- Each item: consumer avatar, last message preview, timestamp, unread badge
- Filter tabs: All / Unread / Quoted / Accepted / Closed

**Chat Window (right panel / mobile full screen):**
- Message stream: text, image, quote card, system message
- Quote card: price, note, available dates, accept/reject buttons (consumer side)
- Input bar: text field + image upload + "Send Quote" button
- Enter chat → batch mark messages as read

### 3.4 Batch 1: Profile Editor

- Form fields: display_name, bio, avatar (upload), city, district, address, price_min, price_max
- Style tags: multi-select from 18 styles
- Live preview: shows public profile appearance (desktop: side panel, mobile: toggle)
- Save: Supabase update on `artists` + `artist_styles`

### 3.5 Batch 1: Portfolio Management

- Grid view of all portfolio items
- Upload: Supabase Storage signed URL → write `portfolio_items` record
- Per-item edit: title, description, body_part, size_cm, style_id, healed_image_url
- Delete: remove from DB + Storage
- Sort order: drag-to-reorder (requires `sort_order` column, new migration)

### 3.6 Batch 2 Summary

| Feature | DB Changes Needed |
|---------|-------------------|
| Calendar | New `artist_availability` table |
| CRM | View over existing inquiries/quotes/messages grouped by consumer |
| Auto-reply templates | New `artist_templates` table |
| Stats | New `artist_stats` materialized view or computed at query time |
| Portfolio sort | `portfolio_items.sort_order` column |

---

## 4. Chat + Inquiry + Quote System

### 4.1 Core Concept

- **Inquiry = Chat Room**: each inquiry creates a conversation between consumer and artist
- **Inquiry form = First message**: structured inquiry data becomes the opening system message
- **Quote = Special message**: quote card rendered inline in chat with action buttons
- **All communication happens in-chat**: no separate quote/response flows

### 4.2 DB: `messages` Table (New)

```sql
CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id      UUID NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
  sender_type     TEXT NOT NULL CHECK (sender_type IN ('consumer', 'artist', 'system')),
  sender_id       TEXT,  -- line_user_id, NULL for system messages
  message_type    TEXT NOT NULL CHECK (message_type IN ('text', 'image', 'quote', 'system')),
  content         TEXT,  -- text content or image URL
  metadata        JSONB DEFAULT '{}',  -- quote: { quote_id, price, note, available_dates }
  read_at         TIMESTAMPTZ,  -- NULL = unread
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS: only inquiry participants can read/write
-- Realtime: enabled for INSERT events
```

### 4.3 API Endpoints

```
POST   /api/inquiries                    Create inquiry (= create chat room)
GET    /api/inquiries                    List chat rooms (with last message + unread count)
GET    /api/inquiries/[id]               Chat room detail (inquiry info + messages)
PATCH  /api/inquiries/[id]               Update inquiry status (close, cancel)
POST   /api/inquiries/[id]/messages      Send message (text or image)
POST   /api/inquiries/[id]/quotes        Send quote (= special message)
PATCH  /api/inquiries/[id]/quotes/[qid]  Accept/reject quote
```

### 4.4 Inquiry Creation Flow

```
POST /api/inquiries
  Input: { artist_id, description, reference_images[], body_part, size_estimate, budget_min, budget_max }

  1. Insert inquiries record (status: 'pending')
  2. Insert system message: structured inquiry summary
     (body_part, size, budget range, description)
  3. Insert image messages for each reference_image
  4. LINE push notification to artist
  5. Return { inquiry_id }
```

### 4.5 Quote Flow (In-Chat)

```
POST /api/inquiries/[id]/quotes
  Input: { price, note, available_dates[] }

  1. Insert quotes record (status: 'sent')
  2. Insert message (type: 'quote', metadata: { quote_id, price, note, available_dates })
  3. Update inquiry status → 'quoted'
  4. LINE push notification to consumer

PATCH /api/inquiries/[id]/quotes/[qid]
  Input: { status: 'accepted' | 'rejected' }

  1. Update quote status
  2. Insert system message ("Consumer accepted/rejected the quote")
  3. If accepted: update inquiry status → 'accepted'
```

### 4.6 Realtime Subscription

```typescript
supabase
  .channel(`inquiry:${inquiryId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `inquiry_id=eq.${inquiryId}`
  }, (payload) => {
    // Append new message to chat UI
  })
  .subscribe()
```

### 4.7 Consumer Chat Pages

Consumer needs chat access outside artist dashboard:

| Route | Page |
|-------|------|
| `/inquiries` | Consumer's chat list (all their inquiries) |
| `/inquiries/[id]` | Full-screen chat with artist |

---

## 5. Image Upload

### 5.1 Flow

```
POST /api/upload/signed-url
  Input: { bucket: 'portfolio' | 'inquiries', filename, content_type }
  Validation: logged in, content_type in [image/jpeg, image/png, image/webp], max 10MB
  Output: { signed_url, public_url }

Frontend: PUT file to signed_url → use public_url in DB record
```

### 5.2 Supabase Storage Buckets

| Bucket | Access | Purpose |
|--------|--------|---------|
| `portfolio` | Public read | Artist portfolio images |
| `inquiries` | Private (RLS) | Consumer reference images |

### 5.3 Thumbnails

Use Supabase Storage image transformations (on-the-fly):
```
{public_url}?width=300&height=300&resize=cover
```

Store transform URL as `thumbnail_url` in `portfolio_items`, or compute client-side.

---

## 6. LINE Push Notifications

### 6.1 Triggers

| Event | Recipient | Message |
|-------|-----------|---------|
| New inquiry | Artist | "{description first 50 chars}" + "View" button |
| New text message | Other participant | "{sender}: {content first 50 chars}" |
| New image message | Other participant | "{sender} sent an image" |
| New quote | Consumer | "{artist} quoted NT${price}" + "View" button |
| Quote accepted | Artist | "Consumer accepted your quote" |

### 6.2 Implementation

- Use `@line/bot-sdk` `messagingApi.pushMessage()`
- Sync send in API route handler (MVP, good enough)
- On failure: log error, do NOT block main operation
- Requires: user has added the LINE Official Account as friend

### 6.3 Message Format

LINE Flex Message with action button linking back to chat page.

---

## 7. Data Flow Summary

```
Consumer browses /artists/[slug]
  → clicks "Inquire" → fills inquiry form (requires login)
  → POST /api/inquiries
  → Creates inquiry + first messages + LINE notifies artist

Artist receives LINE push → opens /artist/dashboard
  → sees new chat (unread badge) → enters chat
  → reads structured inquiry + reference images
  → discusses details via text/image messages
  → sends quote via "Send Quote" button → quote card in chat
  → LINE notifies consumer

Consumer receives LINE push → opens /inquiries/[id]
  → sees quote card → accepts or rejects
  → system message confirms
  → continue chatting to arrange appointment
```

---

## 8. Batch Delivery Plan

### Batch 1 (Core Loop)

1. LINE Login (OAuth Web + LIFF) + Supabase Auth integration
2. Next.js middleware for route protection
3. `messages` table migration
4. API: inquiries CRUD + messages + quotes
5. Image upload (signed URL)
6. Artist dashboard: layout + chat list + chat window
7. Artist profile editor
8. Artist portfolio management
9. Consumer chat pages (/inquiries, /inquiries/[id])
10. LINE push notifications (bidirectional)
11. Supabase Realtime subscription for chat

### Batch 2 (Enhancement)

1. Artist calendar (availability management)
2. Client CRM (consumer history view)
3. Auto-reply templates
4. Analytics dashboard (views, inquiries, conversion)
5. Portfolio drag-to-reorder
6. Chat: read receipts, typing indicator, message search
