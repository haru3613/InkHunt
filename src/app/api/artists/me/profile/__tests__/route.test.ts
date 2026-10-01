import {describe,it,expect,vi,beforeEach} from 'vitest'
import {NextResponse} from 'next/server'
const mocks=vi.hoisted(()=>({auth:vi.fn(),artist:vi.fn(),eq:vi.fn()}))
vi.mock('@/lib/auth/helpers',()=>({requireAuth:mocks.auth,getArtistForUser:mocks.artist,handleApiError:()=>NextResponse.json({error:'Unauthorized'},{status:401})}))
vi.mock('@/lib/supabase/server',()=>({createAdminClient:()=>({from:()=>({select:()=>({eq:mocks.eq})})})}))
import {GET} from '../route'
beforeEach(()=>{mocks.auth.mockResolvedValue({lineUserId:'owner'});mocks.artist.mockResolvedValue({id:'a',status:'pending',address:'Private studio',admin_note:'Internal'});mocks.eq.mockResolvedValue({data:[{styles:{id:1,name:'花卉'}}],error:null})})
describe('private owner profile',()=>{
 it('lets a pending owner retrieve their full profile without admin notes',async()=>{const response=await GET();expect(response.status).toBe(200);expect(await response.json()).toEqual({id:'a',status:'pending',address:'Private studio',styles:[{id:1,name:'花卉'}]});expect(response.headers.get('cache-control')).toBe('private, no-store');expect(mocks.eq).toHaveBeenCalledWith('artist_id','a');expect(mocks.artist).toHaveBeenCalledWith('owner')})
 it('requires authentication and does not invent a profile',async()=>{mocks.auth.mockRejectedValueOnce(new Error('UNAUTHORIZED'));expect((await GET()).status).toBe(401);mocks.artist.mockResolvedValueOnce(null);expect((await GET()).status).toBe(404)})
})
