/**
 * Staging seed script — populates local Supabase with test data.
 *
 * Usage: npx tsx scripts/seed-staging.ts
 *
 * Prerequisites:
 *   1. Local Supabase running: npx supabase start
 *   2. .env.local pointing to local Supabase (or .env.local.staging copied)
 *
 * This script:
 *   1. Creates auth users via admin API (with LINE metadata for RLS)
 *   2. Inserts artists, styles, portfolios
 *   3. Inserts inquiries, quotes, messages, quote requests
 *   4. Inserts favorites
 */

import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'
import { TEST_USERS } from './seed-data/users'
import { SEED_ARTISTS, ARTIST_STYLE_MAP } from './seed-data/artists'
import { SEED_PORTFOLIO_ITEMS } from './seed-data/portfolios'
import {
  SEED_QUOTE_REQUESTS,
  SEED_INQUIRIES,
  SEED_QUOTES,
  SEED_MESSAGES,
  SEED_FAVORITES,
} from './seed-data/conversations'

// --- Config ---
// Local Supabase defaults (from `supabase start` output)
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function derivePassword(lineUserId: string): string {
  return createHmac('sha256', SERVICE_ROLE_KEY).update(lineUserId).digest('hex')
}

// --- Step 1: Create auth users ---
async function seedUsers() {
  console.log('\n📝 Creating auth users...')
  for (const user of TEST_USERS) {
    const email = `${user.lineUserId.toLowerCase()}@line.inkhunt.local`
    const password = derivePassword(user.lineUserId)

    const { data, error } = await supabase.auth.admin.createUser({
      id: user.id,
      email,
      password,
      email_confirm: true,
      user_metadata: {
        line_user_id: user.lineUserId,
        sub: user.lineUserId,
        name: user.displayName,
        provider: 'line',
      },
    })

    if (error) {
      if (error.message.includes('already been registered') || error.message.includes('already exists')) {
        console.log(`  [skip] ${user.displayName} (${user.lineUserId}) — already exists`)
      } else {
        console.error(`  [error] ${user.displayName}: ${error.message}`)
      }
    } else {
      console.log(`  [ok] ${user.displayName} (${user.role}) — ${email}`)
    }
  }
}

// --- Step 2: Insert artists ---
async function seedArtists() {
  console.log('\n🎨 Inserting artists...')
  for (const artist of SEED_ARTISTS) {
    const { error } = await supabase
      .from('artists')
      .upsert(
        {
          ...artist,
          quote_templates: JSON.stringify(artist.quote_templates),
        },
        { onConflict: 'slug' },
      )

    if (error) {
      console.error(`  [error] ${artist.display_name}: ${error.message}`)
    } else {
      console.log(`  [ok] ${artist.display_name} (${artist.status}) — ${artist.city}`)
    }
  }
}

// --- Step 3: Insert artist styles ---
async function seedArtistStyles() {
  console.log('\n🏷️  Linking artist styles...')

  // Get style IDs from DB
  const { data: styles, error: stylesError } = await supabase
    .from('styles')
    .select('id, slug')

  if (stylesError || !styles) {
    console.error('  [error] Failed to fetch styles:', stylesError?.message)
    return
  }

  const styleMap = new Map(styles.map((s) => [s.slug, s.id]))
  let count = 0

  for (const [styleSlug, artistIds] of Object.entries(ARTIST_STYLE_MAP)) {
    const styleId = styleMap.get(styleSlug)
    if (!styleId) {
      console.warn(`  [warn] Style "${styleSlug}" not found in DB`)
      continue
    }

    for (const artistId of artistIds) {
      const { error } = await supabase
        .from('artist_styles')
        .upsert({ artist_id: artistId, style_id: styleId }, { onConflict: 'artist_id,style_id' })

      if (error) {
        console.error(`  [error] ${styleSlug} → ${artistId}: ${error.message}`)
      } else {
        count++
      }
    }
  }
  console.log(`  [ok] ${count} style links created`)
}

// --- Step 4: Insert portfolio items ---
async function seedPortfolios() {
  console.log('\n🖼️  Inserting portfolio items...')

  const { error } = await supabase
    .from('portfolio_items')
    .upsert(SEED_PORTFOLIO_ITEMS, { onConflict: 'id' })

  if (error) {
    console.error(`  [error] ${error.message}`)
  } else {
    console.log(`  [ok] ${SEED_PORTFOLIO_ITEMS.length} portfolio items`)
  }
}

// --- Step 5: Insert quote requests ---
async function seedQuoteRequests() {
  console.log('\n📋 Inserting quote requests...')

  const { error } = await supabase
    .from('quote_requests')
    .upsert(SEED_QUOTE_REQUESTS, { onConflict: 'id' })

  if (error) {
    console.error(`  [error] ${error.message}`)
  } else {
    console.log(`  [ok] ${SEED_QUOTE_REQUESTS.length} quote requests`)
  }
}

// --- Step 6: Insert inquiries ---
async function seedInquiries() {
  console.log('\n💬 Inserting inquiries...')

  const { error } = await supabase
    .from('inquiries')
    .upsert(SEED_INQUIRIES, { onConflict: 'id' })

  if (error) {
    console.error(`  [error] ${error.message}`)
  } else {
    console.log(`  [ok] ${SEED_INQUIRIES.length} inquiries`)
  }
}

// --- Step 7: Insert quotes ---
async function seedQuotes() {
  console.log('\n💰 Inserting quotes...')

  const { error } = await supabase
    .from('quotes')
    .upsert(SEED_QUOTES, { onConflict: 'id' })

  if (error) {
    console.error(`  [error] ${error.message}`)
  } else {
    console.log(`  [ok] ${SEED_QUOTES.length} quotes`)
  }
}

// --- Step 8: Insert messages ---
async function seedMessages() {
  console.log('\n✉️  Inserting messages...')

  const { error } = await supabase
    .from('messages')
    .upsert(SEED_MESSAGES, { onConflict: 'id' })

  if (error) {
    console.error(`  [error] ${error.message}`)
  } else {
    console.log(`  [ok] ${SEED_MESSAGES.length} messages`)
  }
}

// --- Step 9: Insert favorites ---
async function seedFavorites() {
  console.log('\n⭐ Inserting favorites...')

  for (const fav of SEED_FAVORITES) {
    const { error } = await supabase.from('favorites').upsert(fav, {
      onConflict: 'consumer_line_id,artist_id',
    })
    if (error) {
      console.error(`  [error] ${fav.consumer_line_id} → ${fav.artist_id}: ${error.message}`)
    }
  }
  console.log(`  [ok] ${SEED_FAVORITES.length} favorites`)
}

// --- Main ---
async function main() {
  console.log('=== InkHunt Staging Seed ===')
  console.log(`Supabase URL: ${SUPABASE_URL}`)

  // Check connectivity
  const { data: healthCheck, error: healthError } = await supabase
    .from('styles')
    .select('count')
    .limit(1)

  if (healthError) {
    console.error('\n❌ Cannot connect to Supabase. Is it running?')
    console.error(`   Error: ${healthError.message}`)
    console.error('   Run: npx supabase start')
    process.exit(1)
  }

  // Execute in FK-safe order
  await seedUsers()
  await seedArtists()
  await seedArtistStyles()
  await seedPortfolios()
  await seedQuoteRequests()
  await seedInquiries()
  await seedQuotes()
  await seedMessages()
  await seedFavorites()

  console.log('\n=== Seed Complete ===')
  console.log('Test users available for dev-login:')
  console.log('┌──────────────────────┬──────────────────────┬──────────┐')
  console.log('│ Name                 │ LINE User ID         │ Role     │')
  console.log('├──────────────────────┼──────────────────────┼──────────┤')
  for (const u of TEST_USERS) {
    const name = u.displayName.padEnd(20)
    const id = u.lineUserId.padEnd(20).slice(0, 20)
    const role = u.role.padEnd(8)
    console.log(`│ ${name} │ ${id} │ ${role} │`)
  }
  console.log('└──────────────────────┴──────────────────────┴──────────┘')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
