import { describe,it,expect,vi,beforeEach } from 'vitest'
import { render,screen } from '@testing-library/react'
const mocks=vi.hoisted(()=>({works:vi.fn(),user:vi.fn(),saved:vi.fn()}))
vi.mock('@/lib/supabase/queries/explore',()=>({getDiscoveryWorks:mocks.works}))
vi.mock('@/lib/supabase/queries/styles',()=>({getAllStyles:vi.fn(async()=>[])}))
vi.mock('@/lib/auth/helpers',()=>({getCurrentUser:mocks.user}))
vi.mock('@/lib/supabase/queries/favorites',()=>({getFavoritedArtistIds:mocks.saved}))
vi.mock('next-intl/server',()=>({setRequestLocale:vi.fn()}))
vi.mock('@/components/discovery/ExploreFilters',()=>({ExploreFilters:()=>null}))
vi.mock('@/components/discovery/WorkGrid',()=>({WorkGrid:({works,saved}:{works:{id:string}[];saved:Set<string>})=><div data-testid="works" data-saved={Array.from(saved).join(',')}>{works.map(w=><span key={w.id}>{w.id}</span>)}</div>}))
vi.mock('@/components/shared/JsonLd',()=>({JsonLd:()=>null}))
vi.mock('next/image',()=>({default:()=>null}))
vi.mock('@/i18n/navigation',()=>({Link:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
import HomePage from '../page'
const renderPage=async()=>render(await HomePage({params:Promise.resolve({locale:'zh-TW'})}))
beforeEach(()=>{vi.clearAllMocks();mocks.user.mockResolvedValue(null);mocks.works.mockResolvedValue({works:[],total:0,unavailable:false});mocks.saved.mockResolvedValue(new Set(['artist-1']))})
describe('v2 home discovery',()=>{
 it('shows a honest cold-start invitation without fabricated work',async()=>{await renderPage();expect(screen.getByText('好的作品，值得被看見。')).toBeInTheDocument();expect(screen.queryByTestId('works')).not.toBeInTheDocument();expect(screen.getByRole('link',{name:/免費建立作品集/})).toHaveAttribute('href','/artist')})
 it('loads actual work and decorates artist saves for the viewer',async()=>{mocks.works.mockResolvedValue({works:[{id:'work-1',artists:{id:'artist-1'}}],total:1,unavailable:false});mocks.user.mockResolvedValue({lineUserId:'viewer'});await renderPage();expect(mocks.works).toHaveBeenCalledWith({},48);expect(mocks.saved).toHaveBeenCalledWith('viewer',['artist-1']);expect(screen.getByTestId('works')).toHaveAttribute('data-saved','artist-1')})
 it('distinguishes service failure from an empty marketplace',async()=>{mocks.works.mockResolvedValue({works:[],total:0,unavailable:true});await renderPage();expect(screen.getByText('作品暫時無法載入，請稍後再試。')).toBeInTheDocument()})
 it('offers exploration and guidance and states both sides are free',async()=>{await renderPage();expect(screen.getByRole('link',{name:/還沒想法/})).toHaveAttribute('href','/guide');expect(screen.getByRole('link',{name:'探索作品'})).toHaveAttribute('href','/explore');expect(screen.getByText('刺青師與使用者都免費，沒有抽成。')).toBeInTheDocument()})
})
