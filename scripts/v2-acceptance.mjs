#!/usr/bin/env node
// Real HTTP acceptance against ONLY the isolated local v2 stack. No mocks.
import assert from 'node:assert/strict'
import { writeFile, mkdir, readFile } from 'node:fs/promises'
const base=process.env.INKHUNT_V2_BASE_URL||'http://localhost:3200'
assert(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Local host required')
const env=await readFile(new URL('../.env.local',import.meta.url),'utf8')
assert(env.includes('http://127.0.0.1:56321'),'Refusing to run outside the isolated v2 database')
const results=[]
class Actor {
  cookies=new Map()
  async request(path,method='GET',body) {
    const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:body===undefined?undefined:JSON.stringify(body),redirect:'manual'})
    for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');this.cookies.set(pair.slice(0,i),pair.slice(i+1))}
    const text=await response.text();let data;try{data=JSON.parse(text)}catch{data=text}
    return {status:response.status,data,headers:response.headers}
  }
  async login(id){const res=await this.request('/api/auth/dev-login','POST',{line_user_id:id,display_name:`V2 test ${id}`});assert.equal(res.status,200,`local login ${id}`);return this}
}
function check(name,result,expected){assert.equal(Array.isArray(expected) ? expected.includes(result.status) : result.status,Array.isArray(expected) ? true : expected,`${name}: status ${result.status}, response ${typeof result.data==='object'?JSON.stringify(result.data):'non-json'}`);results.push({check:name,status:'passed'});return result.data}
const guest=new Actor(),consumer=await new Actor().login('consumer-002'),artist=await new Actor().login('artist-inked-wolf'),outsider=await new Actor().login('consumer-003'),admin=await new Actor().login('U770e3788b27c6cdeb9248b9f7139f171')
check('guest cannot list private inquiries',await guest.request('/api/inquiries'),401)
const artistData=check('approved artist is publicly discoverable',await guest.request('/api/artists/inked-wolf'),200)
assert(artistData.id)
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==','base64')
const upload=check('consumer can sign a private reference upload',await consumer.request('/api/upload/signed-url','POST',{bucket:'inquiries',filename:'v2-check.png',content_type:'image/png',file_size:png.length}),200)
assert(upload.public_url.startsWith('/api/media/inquiries/'))
const put=await fetch(upload.signed_url,{method:'PUT',headers:{'Content-Type':'image/png'},body:png});assert(put.ok,`storage PUT status ${put.status}`);results.push({check:'private reference bytes uploaded',status:'passed'})
check('uploader can read its reference',await consumer.request(upload.public_url),307)
check('artist cannot read unattached reference',await artist.request(upload.public_url),403)
check('guest cannot read reference',await guest.request(upload.public_url),401)
check('foreign reference cannot be attached',await outsider.request('/api/inquiries','POST',{artist_id:artistData.id,description:'A test request attempting a foreign image',body_part:'手腕',size_estimate:'5cm',reference_images:[upload.public_url]}),400)
const inquiry=check('consumer creates persisted guided inquiry',await consumer.request('/api/inquiries','POST',{artist_id:artistData.id,description:'V2 acceptance: botanical forearm tattoo, please discuss design first.',body_part:'手臂（前臂）',size_estimate:'5 x 8 cm',budget_range:'3k_8k',reference_images:[upload.public_url]}),201)
const inquiryPath=`/api/inquiries/${inquiry.id}`
check('artist can read the attached private reference',await artist.request(upload.public_url),307)
check('unrelated user cannot read attached reference',await outsider.request(upload.public_url),403)
check('unrelated user cannot read conversation',await outsider.request(inquiryPath),[403,404])
check('artist sends persisted reply',await artist.request(`${inquiryPath}/messages`,'POST',{message_type:'text',content:'可以，我們可以先討論植物的線條與大小。'}),201)
const messages=check('consumer reload sees persisted conversation',await consumer.request(`${inquiryPath}/messages`),200)
assert(messages.messages.some(message=>message.content==='可以，我們可以先討論植物的線條與大小。'))
const proposal=check('artist submits quote',await artist.request(`${inquiryPath}/quotes`,'POST',{price:4500,note:'含一次設計討論，實際圖案確認後施作。',available_dates:[]}),201)
check('unrelated user cannot accept quote',await outsider.request(`${inquiryPath}/quotes`,'PATCH',{quote_id:proposal.quote.id,status:'accepted'}),[403,404])
check('consumer accepts quote',await consumer.request(`${inquiryPath}/quotes`,'PATCH',{quote_id:proposal.quote.id,status:'accepted'}),200)
const settledMessages=check('quote cards reflect accepted status after reload',await consumer.request(`${inquiryPath}/messages`),200);assert.equal(settledMessages.messages.find(row=>row.message_type==='quote').metadata.status,'accepted')
check('duplicate quote acceptance rejected',await consumer.request(`${inquiryPath}/quotes`,'PATCH',{quote_id:proposal.quote.id,status:'accepted'}),409)
const starts_at=new Date(Date.now()+14*86400000).toISOString()
check('consumer cannot impersonate appointment proposer',await consumer.request(`${inquiryPath}/appointment`,'POST',{starts_at,location:'台北市測試工作室'}),403)
check('artist proposes appointment',await artist.request(`${inquiryPath}/appointment`,'POST',{starts_at,location:'台北市測試工作室（驗收資料）'}),201)
check('artist cannot self-confirm appointment',await artist.request(`${inquiryPath}/appointment`,'PATCH',{action:'confirm'}),403)
check('consumer confirms appointment',await consumer.request(`${inquiryPath}/appointment`,'PATCH',{action:'confirm'}),200)
const confirmed=check('appointment survives reload',await artist.request(`${inquiryPath}/appointment`),200);assert.equal(confirmed.appointment.status,'confirmed');assert.equal(Date.parse(confirmed.appointment.starts_at),Date.parse(starts_at))
check('outsider cannot inspect appointment details',await outsider.request(`${inquiryPath}/appointment`),[403,404])
check('consumer cancels confirmed appointment',await consumer.request(`${inquiryPath}/appointment`,'PATCH',{action:'cancel'}),200)
check('artist can propose a new time after cancellation',await artist.request(`${inquiryPath}/appointment`,'POST',{starts_at,location:'台北市第二次測試安排'}),201)
check('artist closes inquiry',await artist.request(inquiryPath,'PATCH',{status:'closed'}),200)
const cancelled=check('closing inquiry atomically cancels active appointment',await consumer.request(`${inquiryPath}/appointment`),200);assert.equal(cancelled.appointment.status,'cancelled')
check('closed inquiry cannot accept a new appointment',await artist.request(`${inquiryPath}/appointment`,'POST',{starts_at,location:'should fail'}),403)
check('closed inquiry cannot receive a new quote',await artist.request(`${inquiryPath}/quotes`,'POST',{price:1000,note:'should fail'}),409)
const applicant=await new Actor().login(`v2-applicant-${Date.now()}`)
const application=check('new artist submits pending application',await applicant.request('/api/artists','POST',{display_name:'【驗收】新刺青師',city:'台北市',bio:'V2 local acceptance test artist',price_min:3000,price_max:8000,style_slugs:['floral']}),201)
const ownerProfile=check('pending artist can edit their private profile',await applicant.request('/api/artists/me/profile'),200);assert.equal(ownerProfile.id,application.id)
const portfolioUpload=check('artist can sign a public portfolio upload',await applicant.request('/api/upload/signed-url','POST',{bucket:'portfolio',filename:'acceptance.png',content_type:'image/png',file_size:png.length}),200)
const portfolioPut=await fetch(portfolioUpload.signed_url,{method:'PUT',headers:{'Content-Type':'image/png'},body:png});assert(portfolioPut.ok,'portfolio byte upload')
const work=check('pending artist persists a portfolio work',await applicant.request(`/api/artists/${application.slug}/portfolio`,'POST',{image_url:portfolioUpload.public_url,title:'驗收花卉作品',description:'花 植物 牡丹',body_part:'前臂'}),201)
const ownerWorks=check('pending artist reads own portfolio',await applicant.request('/api/artists/me/portfolio'),200);assert((ownerWorks.data??ownerWorks).some(row=>row.id===work.id))
const edited=check('artist edits work metadata',await applicant.request(`/api/artists/${application.slug}/portfolio/${work.id}`,'PATCH',{title:'已編輯的植物作品',description:'花 植物 牡丹',body_part:'手腕',size_cm:'5 x 8 cm'}),200);assert.equal(edited.title,'已編輯的植物作品')
check('outsider cannot edit another portfolio',await outsider.request(`/api/artists/${application.slug}/portfolio/${work.id}`,'PATCH',{title:'forbidden'}),403)
check('portfolio editor cannot change ownership',await applicant.request(`/api/artists/${application.slug}/portfolio/${work.id}`,'PATCH',{artist_id:artistData.id}),400)
check('duplicate artist application rejected',await applicant.request('/api/artists','POST',{display_name:'duplicate',city:'台北市'}),409)
check('pending artist is not public',await guest.request(`/api/artists/${application.slug}`),404)
check('consumer cannot approve artists',await consumer.request(`/api/admin/artists/${application.id}`,'PATCH',{status:'active'}),403)
check('admin approves artist',await admin.request(`/api/admin/artists/${application.id}`,'PATCH',{status:'active'}),200)
check('approved artist becomes public',await guest.request(`/api/artists/${application.slug}`),200)
check('artist deletes owned portfolio work',await applicant.request(`/api/artists/${application.slug}/portfolio/${work.id}`,'DELETE'),200)
check('admin suspension removes listing',await admin.request(`/api/admin/artists/${application.id}`,'PATCH',{status:'suspended',admin_note:'Local acceptance complete'}),200)
check('suspended artist is no longer public',await guest.request(`/api/artists/${application.slug}`),404)
check('suspended artist cannot receive new inquiries',await consumer.request('/api/inquiries','POST',{artist_id:application.id,description:'Testing inactive artist guard',body_part:'手腕',size_estimate:'3 cm'}),409)
const report={environment:base,database:'isolated local Supabase :56321',timestamp:new Date().toISOString(),inquiryId:inquiry.id,checks:results.length,results}
await mkdir(new URL('../docs/v2/evidence/',import.meta.url),{recursive:true})
await writeFile(new URL('../docs/v2/evidence/acceptance.json',import.meta.url),JSON.stringify(report,null,2)+'\n')
console.log(`PASS ${results.length} real HTTP checks; inquiry ${inquiry.id}`)
