#!/usr/bin/env node
// Real HTTP acceptance for the artist calendar against ONLY the isolated local v2 stack.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

const base = process.env.INKHUNT_CALENDAR_BASE_URL || 'http://127.0.0.1:3210'
const baseUrl = new URL(base)
assert(['localhost', '127.0.0.1'].includes(baseUrl.hostname), 'Local host required')
assert.equal(baseUrl.port, '3210', 'Calendar acceptance must use the isolated :3210 preview')

const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
assert(env.includes('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56321'), 'Refusing to run outside the isolated v2 database')
assert(env.includes('INKHUNT_LOCAL_TEST=true'), 'Local notification guard is required')

const reportUrl = new URL('../docs/design/artist-calendar/http-acceptance.json', import.meta.url)
const results = []

class Actor {
  cookies = new Map()

  async request(path, method = 'GET', body) {
    const response = await fetch(base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'manual',
    })
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(';')[0]
      const separator = pair.indexOf('=')
      this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
    const text = await response.text()
    let data
    try { data = JSON.parse(text) } catch { data = text }
    return { status: response.status, data }
  }

  async login(lineUserId) {
    const response = await this.request('/api/auth/dev-login', 'POST', {
      line_user_id: lineUserId,
      display_name: `Calendar acceptance ${lineUserId}`,
    })
    assert.equal(response.status, 200, `Local login failed for ${lineUserId}`)
    return this
  }
}

function check(name, response, expectedStatus) {
  const statuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus]
  assert(
    statuses.includes(response.status),
    `${name}: status ${response.status}, response ${typeof response.data === 'object' ? JSON.stringify(response.data) : response.data}`,
  )
  results.push({ check: name, status: 'passed', httpStatus: response.status })
  return response.data
}

function dateKeyInTaipei(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Taipei',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function addDays(dateKey, count) {
  const date = new Date(`${dateKey}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return date.toISOString().slice(0, 10)
}

function weekStart(dateKey) {
  const weekday = new Date(`${dateKey}T00:00:00Z`).getUTCDay()
  return addDays(dateKey, weekday === 0 ? -6 : 1 - weekday)
}

function dashboardPath(date, period = 30) {
  return `/api/artist/dashboard?date=${date}&period=${period}`
}

async function fixtureStillExists(actor, fixture) {
  if (!fixture?.inquiryId || !fixture?.appointmentId) return false
  const inquiry = await actor.request(`/api/inquiries/${fixture.inquiryId}`)
  const appointment = await actor.request(`/api/inquiries/${fixture.inquiryId}/appointment`)
  return inquiry.status === 200
    && appointment.status === 200
    && appointment.data?.appointment?.id === fixture.appointmentId
}

async function listAllArtistInquiries(actor) {
  const rows = []
  for (let page = 1; ; page += 1) {
    const response = check(
      `owner inquiry page ${page} loads`,
      await actor.request(`/api/inquiries?role=artist&page=${page}`),
      200,
    )
    rows.push(...response.data)
    if (rows.length >= response.total || response.data.length === 0) return rows
  }
}

async function discoverAppointmentFixtures(actor, inquiries, definitions) {
  const discovered = []
  for (const definition of definitions) {
    const inquiry = inquiries.find(row => row.description === `【行事曆驗收】${definition.description}`)
    if (!inquiry) continue
    const response = await actor.request(`/api/inquiries/${inquiry.id}/appointment`)
    if (response.status !== 200 || !response.data?.appointment) continue
    const appointment = response.data.appointment
    if (appointment.status !== definition.finalStatus || Date.parse(appointment.starts_at) !== Date.parse(definition.startsAt)) continue
    discovered.push({
      key: definition.key,
      inquiryId: inquiry.id,
      quoteId: null,
      appointmentId: appointment.id,
      startsAt: appointment.starts_at,
      bodyPart: inquiry.body_part,
      location: appointment.location,
      status: appointment.status,
    })
  }
  return discovered
}

async function createAppointmentFixture({
  consumer,
  artist,
  artistId,
  key,
  description,
  bodyPart,
  startsAt,
  location,
  finalStatus,
}) {
  const inquiry = check(
    `${key}: consumer creates inquiry`,
    await consumer.request('/api/inquiries', 'POST', {
      artist_id: artistId,
      description: `【行事曆驗收】${description}`,
      body_part: bodyPart,
      size_estimate: '約 8 x 10 cm',
      budget_range: '8k_15k',
      reference_images: [],
    }),
    201,
  )
  const inquiryPath = `/api/inquiries/${inquiry.id}`
  const quote = check(
    `${key}: artist sends quote`,
    await artist.request(`${inquiryPath}/quotes`, 'POST', {
      price: 9800,
      note: `【行事曆驗收】${bodyPart}設計與施作`,
      available_dates: [],
    }),
    201,
  )
  check(
    `${key}: consumer accepts quote`,
    await consumer.request(`${inquiryPath}/quotes`, 'PATCH', {
      quote_id: quote.quote.id,
      status: 'accepted',
    }),
    200,
  )
  const proposed = check(
    `${key}: artist proposes appointment`,
    await artist.request(`${inquiryPath}/appointment`, 'POST', { starts_at: startsAt, location }),
    201,
  )
  if (finalStatus === 'confirmed') {
    check(`${key}: consumer confirms appointment`, await consumer.request(`${inquiryPath}/appointment`, 'PATCH', { action: 'confirm' }), 200)
  } else if (finalStatus === 'cancelled') {
    check(`${key}: consumer cancels appointment`, await consumer.request(`${inquiryPath}/appointment`, 'PATCH', { action: 'cancel' }), 200)
  }
  const persisted = check(
    `${key}: appointment status persists`,
    await artist.request(`${inquiryPath}/appointment`),
    200,
  )
  assert.equal(persisted.appointment.status, finalStatus)
  assert.equal(Date.parse(persisted.appointment.starts_at), Date.parse(startsAt))
  return {
    key,
    inquiryId: inquiry.id,
    quoteId: quote.quote.id,
    appointmentId: proposed.appointment.id,
    startsAt,
    bodyPart,
    location,
    status: finalStatus,
  }
}

const today = dateKeyInTaipei()
const currentWeekStart = weekStart(today)
const nextWeekStart = addDays(currentWeekStart, 7)
const currentWeekSlots = [
  `${addDays(today, 1)}T11:00:00+08:00`,
  `${addDays(today, 2)}T14:30:00+08:00`,
  `${addDays(today, 3)}T16:00:00+08:00`,
]
assert(
  currentWeekSlots.every(value => value.slice(0, 10) < nextWeekStart && Date.parse(value) > Date.now()),
  'This acceptance fixture requires three future slots remaining in the current Taipei week',
)
const nextWeekSlot = `${nextWeekStart}T13:30:00+08:00`

const appointmentDefinitions = [
  {
    key: 'current-week-confirmed-plant',
    description: '植物藤蔓構圖，安排本週確認時段。',
    bodyPart: '左前臂・植物藤蔓',
    startsAt: currentWeekSlots[0],
    location: 'InkHunt 台北工作室・植物席',
    finalStatus: 'confirmed',
    consumerKey: 'two',
  },
  {
    key: 'current-week-proposed-geometry',
    description: '幾何圖騰構圖，等待客人確認本週時段。',
    bodyPart: '右上臂・幾何圖騰',
    startsAt: currentWeekSlots[1],
    location: 'InkHunt 台北工作室・幾何席',
    finalStatus: 'proposed',
    consumerKey: 'three',
  },
  {
    key: 'current-week-cancelled-moon',
    description: '月亮與星芒構圖，用來確認取消預約不顯示。',
    bodyPart: '左肩・月亮與星芒',
    startsAt: currentWeekSlots[2],
    location: 'InkHunt 台北工作室・月亮席',
    finalStatus: 'cancelled',
    consumerKey: 'two',
  },
  {
    key: 'next-week-confirmed-moth',
    description: '夜蛾與植物構圖，安排下週確認時段。',
    bodyPart: '右小腿・夜蛾植物',
    startsAt: nextWeekSlot,
    location: 'InkHunt 台北工作室・夜蛾席',
    finalStatus: 'confirmed',
    consumerKey: 'three',
  },
]

const pagingDefinitions = [
  ['paging-sample-01', '分頁統計樣本 01：植物葉片諮詢。', '手腕・植物葉片'],
  ['paging-sample-02', '分頁統計樣本 02：幾何線條諮詢。', '前臂・幾何線條'],
  ['paging-sample-03', '分頁統計樣本 03：月相圖案諮詢。', '鎖骨・月相圖案'],
  ['paging-sample-04', '分頁統計樣本 04：花卉構圖諮詢。', '小腿・花卉構圖'],
].map(([key, description, bodyPart]) => ({ key, description, bodyPart }))

const guest = new Actor()
const consumerTwo = await new Actor().login('consumer-002')
const consumerThree = await new Actor().login('consumer-003')
const artist = await new Actor().login('artist-inked-wolf')
const otherArtist = await new Actor().login('artist-sakura-ink')

check('guest cannot access artist dashboard', await guest.request(dashboardPath(today)), 401)
check('consumer without artist profile is denied', await consumerTwo.request(dashboardPath(today)), 404)
check('invalid calendar date is rejected', await artist.request(dashboardPath('2026-02-30')), 400)
check('invalid metric period is rejected', await artist.request(dashboardPath(today, 14)), 400)

const artistPublic = check('fixture artist is available locally', await guest.request('/api/artists/inked-wolf'), 200)
assert(artistPublic.id)

const before = check('owner can load dashboard before fixtures', await artist.request(dashboardPath(today)), 200)
const beforeOtherArtist = check('other artist can load only their dashboard', await otherArtist.request(dashboardPath(today)), 200)

let inquiryInventory = await listAllArtistInquiries(artist)

let priorReport = null
try { priorReport = JSON.parse(await readFile(reportUrl, 'utf8')) } catch {}
let fixtures = []
let createdAppointmentCount = 0
if (
  priorReport?.fixtureVersion === 1
  && priorReport?.selectedDate === today
  && Array.isArray(priorReport.fixtures)
  && priorReport.fixtures.length === 4
  && (await Promise.all(priorReport.fixtures.map(fixture => fixtureStillExists(artist, fixture)))).every(Boolean)
) {
  fixtures = priorReport.fixtures
  results.push({ check: 'reuse four persisted calendar fixtures', status: 'passed' })
} else {
  fixtures = await discoverAppointmentFixtures(artist, inquiryInventory, appointmentDefinitions)
  if (fixtures.length === 4) {
    results.push({ check: 'recover four persisted calendar fixtures from HTTP', status: 'passed' })
  } else {
    assert.equal(fixtures.length, 0, 'Refusing to create over a partial calendar fixture set')
    fixtures = []
    for (const definition of appointmentDefinitions) {
      fixtures.push(await createAppointmentFixture({
        consumer: definition.consumerKey === 'two' ? consumerTwo : consumerThree,
        artist,
        artistId: artistPublic.id,
        ...definition,
      }))
      createdAppointmentCount += 1
    }
  }
}

inquiryInventory = await listAllArtistInquiries(artist)
const pagingFixtures = []
let createdPagingCount = 0
for (const [index, definition] of pagingDefinitions.entries()) {
  const existing = inquiryInventory.find(row => row.description === `【行事曆驗收】${definition.description}`)
  if (existing) {
    pagingFixtures.push({ key: definition.key, inquiryId: existing.id, bodyPart: existing.body_part })
    continue
  }
  const consumer = index % 2 === 0 ? consumerTwo : consumerThree
  const created = check(
    `${definition.key}: consumer creates paging inquiry`,
    await consumer.request('/api/inquiries', 'POST', {
      artist_id: artistPublic.id,
      description: `【行事曆驗收】${definition.description}`,
      body_part: definition.bodyPart,
      size_estimate: '約 6 x 8 cm',
      budget_range: '3k_8k',
      reference_images: [],
    }),
    201,
  )
  pagingFixtures.push({ key: definition.key, inquiryId: created.id, bodyPart: definition.bodyPart })
  createdPagingCount += 1
}

const currentWeek = check('owner loads current week after fixtures', await artist.request(dashboardPath(today)), 200)
const nextWeek = check('owner changes to next week', await artist.request(dashboardPath(nextWeekStart)), 200)
const isolatedOtherArtist = check('other artist reload remains isolated', await otherArtist.request(dashboardPath(today)), 200)

const fixtureByKey = Object.fromEntries(fixtures.map(fixture => [fixture.key, fixture]))
const currentAppointmentIds = new Set(currentWeek.appointments.map(appointment => appointment.id))
const nextAppointmentIds = new Set(nextWeek.appointments.map(appointment => appointment.id))
const otherAppointmentIds = new Set(isolatedOtherArtist.appointments.map(appointment => appointment.id))

assert(currentAppointmentIds.has(fixtureByKey['current-week-confirmed-plant'].appointmentId))
assert(currentAppointmentIds.has(fixtureByKey['current-week-proposed-geometry'].appointmentId))
assert(!currentAppointmentIds.has(fixtureByKey['current-week-cancelled-moon'].appointmentId))
assert(!currentAppointmentIds.has(fixtureByKey['next-week-confirmed-moth'].appointmentId))
results.push({ check: 'current week includes confirmed and proposed but excludes cancelled', status: 'passed' })

assert(nextAppointmentIds.has(fixtureByKey['next-week-confirmed-moth'].appointmentId))
assert(!nextAppointmentIds.has(fixtureByKey['current-week-confirmed-plant'].appointmentId))
results.push({ check: 'week change returns next-week appointment only', status: 'passed' })

for (const fixture of fixtures) {
  assert(!otherAppointmentIds.has(fixture.appointmentId), `Other artist leaked appointment ${fixture.appointmentId}`)
  assert(!isolatedOtherArtist.actionQueue.some(item => item.id === fixture.inquiryId), `Other artist leaked inquiry ${fixture.inquiryId}`)
}
results.push({ check: 'other artist cannot see fixture IDs', status: 'passed' })

if (createdAppointmentCount > 0 || createdPagingCount > 0) {
  assert.equal(currentWeek.metrics.newInquiries - before.metrics.newInquiries, createdAppointmentCount + createdPagingCount)
  assert.equal(currentWeek.metrics.quotedInquiries - before.metrics.quotedInquiries, createdAppointmentCount)
  assert.equal(currentWeek.metrics.acceptedInquiries - before.metrics.acceptedInquiries, createdAppointmentCount)
  assert.equal(currentWeek.metrics.upcomingConfirmedAppointments - before.metrics.upcomingConfirmedAppointments, createdAppointmentCount === 4 ? 2 : 0)
  assert.equal(currentWeek.metrics.confirmedAppointments - before.metrics.confirmedAppointments, 0)
  results.push({ check: 'metric deltas match fixtures added by this run', status: 'passed' })
}

assert(currentWeek.metrics.newInquiries > 20, `Expected paged inquiry count above 20, got ${currentWeek.metrics.newInquiries}`)
results.push({ check: 'dashboard aggregation includes more than first 20 inquiries', status: 'passed' })

const expectedFixtureMetricContribution = {
  newInquiries: 8,
  quotedInquiries: 4,
  acceptedInquiries: 4,
  confirmedAppointments: 0,
  upcomingConfirmedAppointments: 2,
}
const fixtureFreeBaselineMetrics = priorReport?.fixtureFreeBaselineMetrics ?? {
  newInquiries: currentWeek.metrics.newInquiries - expectedFixtureMetricContribution.newInquiries,
  quotedInquiries: currentWeek.metrics.quotedInquiries - expectedFixtureMetricContribution.quotedInquiries,
  acceptedInquiries: currentWeek.metrics.acceptedInquiries - expectedFixtureMetricContribution.acceptedInquiries,
  confirmedAppointments: currentWeek.metrics.confirmedAppointments,
  upcomingConfirmedAppointments: currentWeek.metrics.upcomingConfirmedAppointments - expectedFixtureMetricContribution.upcomingConfirmedAppointments,
}
for (const [metric, contribution] of Object.entries(expectedFixtureMetricContribution)) {
  assert.equal(
    currentWeek.metrics[metric] - fixtureFreeBaselineMetrics[metric],
    contribution,
    `${metric} does not retain the expected fixture contribution`,
  )
}
results.push({ check: 'aggregate metrics retain the expected fixture cohort contribution', status: 'passed' })

const fixturesWithLocalTime = fixtures.map(fixture => ({
  ...fixture,
  localStartsAt: appointmentDefinitions.find(definition => definition.key === fixture.key)?.startsAt,
}))

const report = {
  fixtureVersion: 1,
  environment: base,
  database: 'isolated local Supabase :56321',
  localNotificationGuard: true,
  timestamp: new Date().toISOString(),
  selectedDate: today,
  weeks: {
    current: currentWeek.week,
    next: nextWeek.week,
  },
  fixtures: fixturesWithLocalTime,
  pagingFixtures,
  expectedFixtureMetricContribution,
  fixtureFreeBaselineMetrics,
  baselineMetrics: before.metrics,
  finalMetrics: currentWeek.metrics,
  otherArtistBaselineMetrics: beforeOtherArtist.metrics,
  visibleAppointmentIds: {
    currentWeek: currentWeek.appointments.map(appointment => appointment.id),
    nextWeek: nextWeek.appointments.map(appointment => appointment.id),
  },
  checks: results.length,
  results,
}

await mkdir(new URL('../docs/design/artist-calendar/', import.meta.url), { recursive: true })
await writeFile(reportUrl, `${JSON.stringify(report, null, 2)}\n`)
console.log(`PASS ${results.length} real HTTP checks; ${fixtures.length} persisted calendar fixtures`)
for (const fixture of fixtures) {
  console.log(`${fixture.key}: inquiry=${fixture.inquiryId} appointment=${fixture.appointmentId} starts=${fixture.startsAt} status=${fixture.status}`)
}
