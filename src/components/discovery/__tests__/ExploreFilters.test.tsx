import {describe,it,expect,vi,beforeEach} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
const {push,params}=vi.hoisted(()=>({push:vi.fn(),params:{value:'city=台北市&page=4'}}))
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(params.value)}))
vi.mock('@/i18n/navigation',()=>({useRouter:()=>({push})}))
import {ExploreFilters} from '../ExploreFilters'
beforeEach(()=>push.mockClear())
describe('gallery filters',()=>{
 it('preserves the city but resets pagination when choosing a subject',()=>{render(<ExploreFilters styles={[]} en={false}/>);fireEvent.click(screen.getByRole('button',{name:'植物花卉'}));const q=new URL(push.mock.calls[0][0],'http://localhost').searchParams;expect(q.get('city')).toBe('台北市');expect(q.get('subject')).toBe('botanical');expect(q.has('page')).toBe(false)})
 it('clears a selected region and exposes all 22 Taiwan regions',()=>{render(<ExploreFilters styles={[]} en={false}/>);expect(screen.getByRole('combobox',{name:'地區'}).querySelectorAll('option')).toHaveLength(23);fireEvent.change(screen.getByRole('combobox',{name:'地區'}),{target:{value:''}});expect(push.mock.calls[0][0]).toBe('/explore?')})
 it('home filters start an independent discovery query',()=>{render(<ExploreFilters styles={[]} en home/>);fireEvent.click(screen.getByRole('button',{name:'Animals'}));expect(push).toHaveBeenCalledWith('/explore?subject=animals',{scroll:false})})
})
