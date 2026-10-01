#!/usr/bin/env node
// Read-only timings against local previews. Credentials stay only in memory.
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
const targets = process.argv.slice(2)
assert(targets.length > 0, 'Pass one or more local preview base URLs')
for (const base of targets) {
  const url = new URL(base)
  assert(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname), 'Only local previews are allowed')
}
const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
assert(env.includes('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56321') && env.includes('INKHUNT_LOCAL_TEST=true'), 'Isolated database required')
const login = await fetch('http://127.0.0.1:3200/api/auth/dev-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ line_user_id: 'artist-inked-wolf', display_name: 'InkedWolf local test' }) })
assert.equal(login.status, 200, 'Local fixture sign-in failed')
const cookies = new Map()
function absorb(response) {
  for (const cookie of response.headers.getSetCookie()) {
    const pair = cookie.split(';')[0], split = pair.indexOf('=')
    cookies.set(pair.slice(0, split), pair.slice(split + 1))
  }
}
absorb(login)
const results = []
for (const base of targets) {
  for (const route of ['/zh-TW/artist/dashboard', '/api/artist/dashboard', '/api/auth/me', '/api/styles']) {
    const samples = []
    let headers
    for (let sample = 0; sample < 7; sample++) {
      const start = performance.now()
      const response = await fetch(base + route, { redirect: 'manual', headers: { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') } })
      absorb(response)
      const body = await response.text()
      assert.equal(response.status, 200, `${base}${route} failed: ${response.status}`)
      if (route === '/api/auth/me') assert(JSON.parse(body).user, 'Must measure authenticated responses')
      if (route === '/api/artist/dashboard') assert.equal(typeof JSON.parse(body).metrics.newInquiries, 'number')
      samples.push(Math.round((performance.now() - start) * 10) / 10)
      headers = { browserCache: response.headers.get('cache-control'), edgeCache: response.headers.get('vercel-cdn-cache-control') }
    }
    const warm = samples.slice(1).sort((a, b) => a - b)
    results.push({ base, route, firstMs: samples[0], warmMedianMs: Math.round((warm[2] + warm[3]) * 5) / 10, warmMinMs: warm[0], warmMaxMs: warm.at(-1), samplesMs: samples, ...headers })
  }
}
const report = { timestamp: new Date().toISOString(), database: 'isolated local Supabase :56321', notes: 'HTTP response timings, not browser rendering; local results do not prove hosted region/CDN gains.', results }
await mkdir(new URL('../docs/performance/', import.meta.url), { recursive: true })
await writeFile(new URL('../docs/performance/local-preview-measurements.json', import.meta.url), JSON.stringify(report, null, 2) + '\n')
for (const item of results) console.log(`${item.base} ${item.route}: first ${item.firstMs}ms; warm median ${item.warmMedianMs}ms`)
