import {describe,it,expect,vi,beforeEach} from 'vitest'
import {render,screen} from '@testing-library/react'
const {query,user,saved}=vi.hoisted(()=>({query:vi.fn(),user:vi.fn(),saved:vi.fn()}))
vi.mock('@/lib/supabase/queries/explore',()=>({getDiscoveryWorks:query}))
vi.mock('@/lib/supabase/queries/styles',()=>({getAllStyles:async()=>[]}))
vi.mock('@/lib/auth/helpers',()=>({getCurrentUser:user}))
vi.mock('@/lib/supabase/queries/favorites',()=>({getFavoritedArtistIds:saved}))
vi.mock('next-intl/server',()=>({setRequestLocale:vi.fn()}))
vi.mock('@/components/discovery/ExploreFilters',()=>({ExploreFilters:()=>null}))
vi.mock('@/components/discovery/WorkGrid',()=>({WorkGrid:()=> <div data-testid="grid"/>}))
vi.mock('@/i18n/navigation',()=>({Link:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
import Page,{generateMetadata} from '../page'
const props={params:Promise.resolve({locale:'zh-TW'}),searchParams:Promise.resolve({subject:'animals'})}
beforeEach(()=>{query.mockResolvedValue({works:[],total:0,page:1,unavailable:false});user.mockResolvedValue(null)})
describe('explore page',()=>{
 it('makes filtered pages noindex while canonical points to discovery',async()=>{const m=await generateMetadata(props);expect(m.robots).toEqual({index:false,follow:true});expect(m.alternates?.canonical).toContain('/zh-TW/explore')})
 it('provides recoverable empty and service failure states',async()=>{const r=render(await Page(props));expect(screen.getByText('目前還沒有符合的作品')).toBeInTheDocument();r.unmount();query.mockResolvedValue({works:[],total:0,page:1,unavailable:true});render(await Page(props));expect(screen.getByText('作品暫時無法載入')).toBeInTheDocument()})
 it('renders real work with pagination and user-specific saves',async()=>{query.mockResolvedValue({works:[{artists:{id:'a'}}],total:51,page:2,unavailable:false});user.mockResolvedValue({lineUserId:'viewer'});saved.mockResolvedValue(new Set(['a']));render(await Page(props));expect(saved).toHaveBeenCalledWith('viewer',['a']);expect(screen.getByTestId('grid')).toBeInTheDocument();expect(screen.getByRole('link',{name:'下一頁'})).toHaveAttribute('href','/explore?subject=animals&page=3');expect(screen.getByRole('link',{name:'上一頁'})).toHaveAttribute('href','/explore?subject=animals&page=1')})
})
