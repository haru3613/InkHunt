import {describe,expect,it,vi,beforeEach} from 'vitest'
import {NextRequest,NextResponse} from 'next/server'
vi.mock('@/lib/auth/helpers',()=>({requireAuth:vi.fn(),authorizeInquiryAccess:vi.fn(),handleApiError:vi.fn((e:Error)=>NextResponse.json({error:e.message},{status:e.message==='UNAUTHORIZED'?401:e.message==='FORBIDDEN'?403:500}))}))
vi.mock('@/lib/supabase/queries/inquiries',()=>({getInquiryById:vi.fn()}))
vi.mock('@/lib/booking/appointments',()=>({getAppointment:vi.fn(),proposeAppointment:vi.fn(),transitionAppointment:vi.fn()}))
import {GET,POST,PATCH} from '../route'
import {requireAuth,authorizeInquiryAccess} from '@/lib/auth/helpers'
import {getInquiryById} from '@/lib/supabase/queries/inquiries'
import {getAppointment,proposeAppointment,transitionAppointment} from '@/lib/booking/appointments'
const ctx={params:Promise.resolve({id:'i1'})}
const user={lineUserId:'artist',supabaseId:'u1',displayName:'Artist',avatarUrl:null}
const appointment={id:'a1',inquiry_id:'i1',status:'proposed',starts_at:'2030-01-01T10:00:00Z',location:'台北工作室',proposed_by_line_id:'private-id',cancelled_by_line_id:null,confirmed_at:null,cancelled_at:null} as const
const request=(method:string,body:unknown)=>new NextRequest('http://localhost/api/inquiries/i1/appointment',{method,body:JSON.stringify(body),headers:{'Content-Type':'application/json'}})
beforeEach(()=>{vi.clearAllMocks();vi.mocked(requireAuth).mockResolvedValue(user);vi.mocked(getInquiryById).mockResolvedValue({id:'i1',status:'accepted'} as never);vi.mocked(authorizeInquiryAccess).mockResolvedValue({isArtist:true,isConsumer:false,artist:{status:'active'} as never});vi.mocked(getAppointment).mockResolvedValue(appointment)})
describe('appointment access and transitions',()=>{
 it('requires authentication and participant access',async()=>{vi.mocked(requireAuth).mockRejectedValueOnce(new Error('UNAUTHORIZED'));expect((await GET(request('GET',undefined),ctx)).status).toBe(401);vi.mocked(authorizeInquiryAccess).mockRejectedValueOnce(new Error('FORBIDDEN'));expect((await GET(request('GET',undefined),ctx)).status).toBe(403);expect(getAppointment).not.toHaveBeenCalled()})
 it('returns 404 for missing inquiry and no private identity fields',async()=>{vi.mocked(getInquiryById).mockResolvedValueOnce(null);expect((await GET(request('GET',undefined),ctx)).status).toBe(404);const response=await GET(request('GET',undefined),ctx);expect(JSON.stringify(await response.json())).not.toContain('private-id');expect(response.headers.get('cache-control')).toBe('private, no-store')})
 it.each([{starts_at:'2000-01-01T00:00:00Z',location:'x'},{starts_at:'2030-01-01T00:00:00Z',location:'   '},{starts_at:'garbage',location:'x'}])('rejects invalid proposal %j before persistence',async body=>{expect((await POST(request('POST',body),ctx)).status).toBe(400);expect(proposeAppointment).not.toHaveBeenCalled()})
 it('only lets an active artist propose for an accepted inquiry',async()=>{vi.mocked(authorizeInquiryAccess).mockResolvedValueOnce({isArtist:false,isConsumer:true,artist:null});expect((await POST(request('POST',{starts_at:appointment.starts_at,location:'x'}),ctx)).status).toBe(403);vi.mocked(getInquiryById).mockResolvedValueOnce({id:'i1',status:'closed'} as never);expect((await POST(request('POST',{starts_at:appointment.starts_at,location:'x'}),ctx)).status).toBe(403)})
 it('derives proposal actor from session and returns public data',async()=>{vi.mocked(proposeAppointment).mockResolvedValue(appointment);const response=await POST(request('POST',{starts_at:appointment.starts_at,location:' 工作室 ',proposed_by_line_id:'attacker'}),ctx);expect(response.status).toBe(201);expect(proposeAppointment).toHaveBeenCalledWith({inquiry_id:'i1',starts_at:'2030-01-01T10:00:00.000Z',location:'工作室',proposed_by_line_id:'artist'});expect(JSON.stringify(await response.json())).not.toContain('private-id')})
 it('blocks artist confirmation but allows participant cancellation',async()=>{expect((await PATCH(request('PATCH',{action:'confirm'}),ctx)).status).toBe(403);vi.mocked(transitionAppointment).mockResolvedValue({...appointment,status:'cancelled'});expect((await PATCH(request('PATCH',{action:'cancel'}),ctx)).status).toBe(200)})
 it('returns conflict when consumer confirmation loses a state race',async()=>{vi.mocked(authorizeInquiryAccess).mockResolvedValue({isArtist:false,isConsumer:true,artist:null});vi.mocked(transitionAppointment).mockResolvedValue(null);expect((await PATCH(request('PATCH',{action:'confirm'}),ctx)).status).toBe(409)})
 it('rejects unknown actions and already cancelled arrangements',async()=>{expect((await PATCH(request('PATCH',{action:'erase'}),ctx)).status).toBe(400);vi.mocked(getAppointment).mockResolvedValue({...appointment,status:'cancelled'});expect((await PATCH(request('PATCH',{action:'confirm'}),ctx)).status).toBe(409);expect(transitionAppointment).not.toHaveBeenCalled()})
 it('returns a retryable conflict for duplicate proposals',async()=>{vi.mocked(proposeAppointment).mockRejectedValue({code:'23505'});expect((await POST(request('POST',{starts_at:appointment.starts_at,location:'x'}),ctx)).status).toBe(409)})
})

vi.mock('@/lib/line/defer', () => ({ deferLineNotification: (task: () => Promise<void>) => { void task().catch(() => {}) } }))
