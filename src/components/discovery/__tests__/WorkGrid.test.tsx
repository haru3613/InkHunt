import {describe,it,expect,vi} from 'vitest'
import {render,screen} from '@testing-library/react'
vi.mock('next/image',()=>({default:({alt}:{alt:string})=><span role="img" aria-label={alt}/>}))
vi.mock('@/i18n/navigation',()=>({Link:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
vi.mock('@/components/artists/FavoriteButton',()=>({FavoriteButton:({artistId,initialFavorited}:{artistId:string;initialFavorited:boolean})=><button aria-pressed={initialFavorited}>{artistId}</button>}))
import {WorkGrid} from '../WorkGrid'
const work={id:'w',title:'花卉手臂',description:null,image_url:'/styles/floral.avif',body_part:null,healed_image_url:null,artists:{id:'a',slug:'artist-a',display_name:'創作者 A',city:'台北市',avatar_url:null},styles:{slug:'floral',name:'花卉',name_en:'Floral'}}
describe('real portfolio grid',()=>{
 it('connects a work to its creator and reflects saved artist state',()=>{render(<WorkGrid works={[work]} saved={new Set(['a'])}/>);expect(screen.getByRole('img')).toHaveAccessibleName('花卉手臂');expect(screen.getByRole('link',{name:'創作者 A'})).toHaveAttribute('href','/artists/artist-a');expect(screen.getByRole('button',{name:'a'})).toHaveAttribute('aria-pressed','true')})
 it('has useful fallback text for untitled work without style',()=>{render(<WorkGrid works={[{...work,title:null,styles:null}]} en/>);expect(screen.getByRole('img')).toHaveAccessibleName("創作者 A's tattoo");expect(screen.getByText(/Tattoo work/)).toBeInTheDocument()})
})
