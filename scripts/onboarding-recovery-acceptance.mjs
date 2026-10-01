#!/usr/bin/env node
// Local-only API verification. The script deletes only the portfolio row it creates.
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
const base = 'http://127.0.0.1:3220'
const env = await readFile(new URL('../.env.local', import.meta.url), 'utf8')
assert(env.includes('NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56321') && env.includes('INKHUNT_LOCAL_TEST=true'), 'Isolated local stack required')
const results = []
class Actor {
  cookies = new Map()
  async req(path, method = 'GET', body, origin = base) {
    const response = await fetch(origin + path, { method, redirect: 'manual', headers: { 'Content-Type': 'application/json', Cookie: [...this.cookies].map(([k,v]) => `${k}=${v}`).join('; ') }, body: body === undefined ? undefined : JSON.stringify(body) })
    for (const cookie of response.headers.getSetCookie()) { const pair = cookie.split(';')[0]; const i = pair.indexOf('='); this.cookies.set(pair.slice(0,i),pair.slice(i+1)) }
    return { status: response.status, data: await response.json() }
  }
  async login(id) { assert.equal((await this.req('/api/auth/dev-login','POST',{line_user_id:id,display_name:'Local onboarding acceptance'}, 'http://127.0.0.1:3200')).status,200);return this }
}
const owner=await new Actor().login('consumer-002')
const stranger=await new Actor().login('consumer-001')
const me=await owner.req('/api/auth/me')
assert(me.data.artist?.slug, 'Complete the local browser onboarding fixture first')
const slug=encodeURIComponent(me.data.artist.slug)
const list=await owner.req('/api/artists/me/portfolio')
const items=list.data.data ?? list.data
assert(items.length>0, 'Browser fixture must include one local test image')
const image_url=items[0].image_url
assert(new URL(image_url).hostname === '127.0.0.1', 'Only local fixture images allowed')
const id=randomUUID()
const path=`/api/artists/${slug}/portfolio`
try {
 const concurrent=await Promise.all([owner.req(path,'POST',{image_url,idempotency_key:id}),owner.req(path,'POST',{image_url,idempotency_key:id})])
 assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,201]);assert(concurrent.every(r=>r.data.id===id))
 results.push('Concurrent identical submissions create one portfolio row')
 const retry=await owner.req(path,'POST',{image_url,caption:'must not overwrite',idempotency_key:id})
 assert.equal(retry.status,200);assert.equal(retry.data.id,id);assert.notEqual(retry.data.caption,'must not overwrite')
 results.push('Lost-response retry returns original row without overwriting')
 const after=await owner.req('/api/artists/me/portfolio')
 assert.equal((after.data.data??after.data).filter(row=>row.id===id).length,1)
 results.push('Database-backed read contains exactly one keyed row')
 assert.equal((await stranger.req(path,'POST',{image_url,idempotency_key:id})).status,403)
 results.push('Another account cannot use the owner endpoint')
 assert.equal((await owner.req(path,'POST',{image_url,idempotency_key:'invalid'})).status,400)
 results.push('Invalid idempotency key rejected')
 assert.equal((await owner.req('/api/artists','POST',{display_name:'Local invalid price',city:'台北市',price_min:2000,price_max:1000})).status,400)
 results.push('Server rejects an inverted reference-price range')
} finally {
 const cleanup=await owner.req(`${path}/${id}`,'DELETE')
 assert.equal(cleanup.status,200, 'Failed to clean the single created acceptance row')
}
await mkdir(new URL('../docs/verification/onboarding-recovery/',import.meta.url),{recursive:true})
await writeFile(new URL('../docs/verification/onboarding-recovery/http-acceptance.json',import.meta.url),JSON.stringify({timestamp:new Date().toISOString(),environment:'isolated local Supabase :56321 + preview :3220',results:results.map(check=>({check,status:'passed'})),cleanup:'Created row removed; browser fixture retained'},null,2)+'\n')
console.log(`${results.length} local HTTP acceptance checks passed; created row cleaned up.`)
