import {describe,it,expect,vi,beforeEach} from 'vitest'
const {safeAdminClient,reportError}=vi.hoisted(()=>({safeAdminClient:vi.fn(),reportError:vi.fn()}))
vi.mock('@/lib/supabase/admin',()=>({safeAdminClient}))
vi.mock('@/lib/observability',()=>({reportError}))
import {getDiscoveryWorks} from '../explore'
function client(result:unknown){const chain:Record<string,ReturnType<typeof vi.fn>>={};for(const method of ['select','eq','or','order'])chain[method]=vi.fn(()=>chain);chain.range=vi.fn(async()=>result);const from=vi.fn(()=>chain);safeAdminClient.mockReturnValue({from});return chain}
beforeEach(()=>vi.clearAllMocks())
describe('discovery privacy and query composition',()=>{
 it('only selects approved artists and an explicit public identity projection',async()=>{const q=client({data:[],count:0,error:null});await getDiscoveryWorks({city:'台北市',subject:'botanical',style:'fine-line',page:'2'});expect(q.eq).toHaveBeenCalledWith('artists.status','active');expect(q.eq).toHaveBeenCalledWith('artists.city','台北市');expect(q.eq).toHaveBeenCalledWith('styles.slug','fine-line');expect(q.select.mock.calls[0][0]).not.toMatch(/line_user_id|address|\*/);expect(q.range).toHaveBeenCalledWith(24,47);expect(q.or.mock.calls[0][0]).toContain('title.ilike.%花%')})
 it('does not interpolate untrusted subject text',async()=>{const q=client({data:[],count:0,error:null});await getDiscoveryWorks({subject:'foo),artists.status.eq.pending'});expect(q.or).not.toHaveBeenCalled()})
 it('reports a service failure distinctly from no results',async()=>{client({data:null,error:{message:'offline'},count:null});expect((await getDiscoveryWorks()).unavailable).toBe(true);expect(reportError).toHaveBeenCalled()})
})
