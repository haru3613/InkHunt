import { createClient } from '@supabase/supabase-js'
import { TEST_USERS } from './seed-data/users'
import { SEED_ARTISTS } from './seed-data/artists'
import { SEED_PORTFOLIO_ITEMS } from './seed-data/portfolios'

const expectedUrl = 'http://127.0.0.1:56321'
const url = process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (url !== expectedUrl) {
  throw new Error(`Refusing local auth repair for unexpected URL: ${url ?? 'missing'}`)
}
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required')

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 })
  if (error) throw error

  const usersById = new Map(data.users.map((user) => [user.id, user]))
  for (const testUser of TEST_USERS) {
    const authUser = usersById.get(testUser.id)
    if (!authUser) throw new Error(`Missing seeded auth user: ${testUser.lineUserId}`)

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      app_metadata: {
        ...(authUser.app_metadata ?? {}),
        line_user_id: testUser.lineUserId,
        provider: 'line',
      },
    })
    if (updateError) throw updateError
  }

  // Make local-only demo records unmistakable and replace generic remote
  // placeholders with bundled style reference art. These are illustrative
  // fixtures, not claims about a real artist's portfolio.
  for (const [index, artist] of SEED_ARTISTS.entries()) {
    const styleImages = [
      '/styles/illustrative.avif',
      '/styles/floral.avif',
      '/styles/geometric.avif',
      '/styles/japanese-traditional.avif',
      '/styles/dotwork.avif',
      '/styles/watercolor.avif',
      '/styles/ornamental.avif',
    ]
    const { error: artistError } = await supabase
      .from('artists')
      .update({
        display_name: artist.display_name.startsWith('【測試】')
          ? artist.display_name
          : `【測試】${artist.display_name}`,
        avatar_url: styleImages[index % styleImages.length],
      })
      .eq('id', artist.id)
    if (artistError) throw artistError
  }

  const portfolioStyleImages = [
    '/styles/illustrative.avif',
    '/styles/floral.avif',
    '/styles/geometric.avif',
    '/styles/japanese-traditional.avif',
    '/styles/neo-traditional.avif',
    '/styles/dotwork.avif',
    '/styles/ornamental.avif',
    '/styles/watercolor.avif',
    '/styles/abstract.avif',
    '/styles/lettering.avif',
  ]
  const portfolioStyleSlugs = [
    'realism',
    'portrait',
    'floral',
    'realism',
    'coverup',
    'realism',
    'blackwork',
    'japanese-traditional',
    'japanese-traditional',
    'neo-traditional',
    'japanese-traditional',
    'japanese-traditional',
    'fine-line',
    'japanese-traditional',
    'geometric',
    'dotwork',
    'tribal',
    'blackwork',
    'geometric',
    'blackwork',
    'illustrative',
    'fine-line',
    'fine-line',
    'watercolor',
    'illustrative',
  ]
  const { data: styles, error: stylesError } = await supabase.from('styles').select('id, slug')
  if (stylesError) throw stylesError
  const styleIdBySlug = new Map((styles ?? []).map((style) => [style.slug, style.id]))
  for (const [index, item] of SEED_PORTFOLIO_ITEMS.entries()) {
    const imageUrl = portfolioStyleImages[index % portfolioStyleImages.length]
    const styleSlug = portfolioStyleSlugs[index]
    const styleId = styleIdBySlug.get(styleSlug)
    if (!styleId) throw new Error(`Missing style for local portfolio fixture: ${styleSlug}`)
    const { error: portfolioError } = await supabase
      .from('portfolio_items')
      .update({
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        style_id: styleId,
        title: item.title.startsWith('【展示圖') ? item.title : `【展示圖｜非作品照】${item.title}`,
        description: item.description
          ? `本機 MVP 情境資料；圖片為風格參考，非刺青師作品。${item.description}`
          : '本機 MVP 情境資料；圖片為風格參考，非刺青師作品。',
      })
      .eq('id', item.id)
    if (portfolioError) throw portfolioError
  }

  const expectedMinimums: Record<string, number> = {
    styles: 1,
    artists: 1,
    portfolio_items: 1,
    inquiries: 1,
    messages: 1,
  }
  for (const [table, minimum] of Object.entries(expectedMinimums)) {
    const { count, error: countError } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
    if (countError) throw countError
    if ((count ?? 0) < minimum) throw new Error(`${table} has ${count ?? 0} rows; expected at least ${minimum}`)
    console.log(`  [verified] ${table}: ${count} rows`)
  }

  const { data: verifiedUsers, error: verifyError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  })
  if (verifyError) throw verifyError
  for (const testUser of TEST_USERS) {
    const authUser = verifiedUsers.users.find((user) => user.id === testUser.id)
    if (authUser?.app_metadata?.line_user_id !== testUser.lineUserId) {
      throw new Error(`Trusted identity was not set for ${testUser.lineUserId}`)
    }
  }
  console.log(`  [verified] ${TEST_USERS.length} login identities use trusted app_metadata`)
  console.log(`  [verified] ${SEED_ARTISTS.length} demo artists are labelled 【測試】`)
  console.log(`  [verified] ${SEED_PORTFOLIO_ITEMS.length} portfolio fixtures use bundled style references`)
  console.log(`  [verified] ${SEED_PORTFOLIO_ITEMS.length} portfolio fixtures have semantic style IDs`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
