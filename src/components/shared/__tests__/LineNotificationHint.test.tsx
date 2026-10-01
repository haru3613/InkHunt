import {afterEach,describe,expect,it,vi} from 'vitest'
import {render,screen} from '@testing-library/react'
vi.mock('next-intl',()=>({useLocale:()=> 'zh-TW'}))
import {LineNotificationHint} from '../LineNotificationHint'
afterEach(()=>vi.unstubAllEnvs())
describe('LINE reminder eligibility',()=>{
  it('always gives a usable in-app fallback without inventing an account',()=>{
    vi.stubEnv('NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL','')
    render(<LineNotificationHint/>);expect(screen.getByText(/回覆與預約更新/)).toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
  it('links only the explicitly configured official account and explains the friend requirement',()=>{
    vi.stubEnv('NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL','https://line.me/R/ti/p/%40inkhunt')
    render(<LineNotificationHint/>);expect(screen.getByRole('link')).toHaveAttribute('href','https://line.me/R/ti/p/%40inkhunt');expect(screen.getByText(/需先加入官方帳號好友/)).toBeInTheDocument()
  })
  it.each(['javascript:alert(1)','https://line.me.evil.example/account'])('rejects unsafe configuration %s',url=>{
    vi.stubEnv('NEXT_PUBLIC_LINE_OFFICIAL_ACCOUNT_URL',url);render(<LineNotificationHint/>);expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
