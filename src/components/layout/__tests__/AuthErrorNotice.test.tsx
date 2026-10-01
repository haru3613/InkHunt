import {beforeEach,describe,expect,it,vi} from 'vitest'
import {render,screen,fireEvent} from '@testing-library/react'
const m=vi.hoisted(()=>({query:'',replace:vi.fn()}))
vi.mock('next-intl',()=>({useLocale:()=> 'zh-TW'}))
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(m.query)}))
vi.mock('@/i18n/navigation',()=>({usePathname:()=> '/',useRouter:()=>({replace:m.replace})}))
import {AuthErrorNotice} from '../AuthErrorNotice'
beforeEach(()=>{m.query='';m.replace.mockClear()})
describe('login failure recovery',()=>{
  it('does not add noise to successful visits',()=>{render(<AuthErrorNotice/>);expect(screen.queryByRole('alert')).not.toBeInTheDocument()})
  it('offers a safe server entry retry preserving the intended destination',()=>{m.query='auth_error=callback_failed&returnTo=%2Fzh-TW%2Fartists%2Fink%3Finquiry%3D1';render(<AuthErrorNotice/>);expect(screen.getByRole('alert')).toHaveTextContent('登入尚未完成');expect(screen.getByRole('link')).toHaveAttribute('href','/api/auth/line?redirect=%2Fzh-TW%2Fartists%2Fink%3Finquiry%3D1')})
  it('clears error parameters without echoing attacker content',()=>{m.query='auth_error=%3Cscript%3E&city=Taipei';render(<AuthErrorNotice/>);expect(screen.queryByText('<script>')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'先繼續瀏覽'}));expect(m.replace).toHaveBeenCalledWith('/?city=Taipei',{scroll:false})})
})
