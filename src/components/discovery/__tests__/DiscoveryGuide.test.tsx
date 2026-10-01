import {describe,it,expect,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
vi.mock('next-intl',()=>({useLocale:()=> 'zh-TW'}))
vi.mock('@/i18n/navigation',()=>({Link:({href,children,...props}:{href:string;children:React.ReactNode})=><a href={href} {...props}>{children}</a>}))
import {DiscoveryGuide} from '../DiscoveryGuide'
describe('discovery guide',()=>{
 it('takes an undecided visitor through subject and location to a shareable filtered result',()=>{render(<DiscoveryGuide/>);fireEvent.click(screen.getByRole('button',{name:'植物花卉'}));fireEvent.click(screen.getByRole('button',{name:'下一步'}));fireEvent.change(screen.getByRole('combobox'),{target:{value:'台北市'}});fireEvent.click(screen.getByRole('button',{name:'下一步'}));expect(screen.getByRole('link',{name:'看看這些作品'})).toHaveAttribute('href','/explore?subject=botanical&city=%E5%8F%B0%E5%8C%97%E5%B8%82');fireEvent.click(screen.getByRole('button',{name:'上一步'}));expect(screen.getByRole('combobox')).toHaveValue('台北市')})
 it('allows uncertainty without requiring fabricated preferences',()=>{render(<DiscoveryGuide/>);fireEvent.click(screen.getByRole('button',{name:'下一步'}));fireEvent.click(screen.getByRole('button',{name:'下一步'}));expect(screen.getByText('不限題材')).toBeInTheDocument();expect(screen.getByRole('link',{name:'看看這些作品'})).toHaveAttribute('href','/explore?')})
})
