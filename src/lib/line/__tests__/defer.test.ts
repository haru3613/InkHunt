import {beforeEach,describe,expect,it,vi} from 'vitest'
const mocks=vi.hoisted(()=>({after:vi.fn(),reportError:vi.fn()}))
vi.mock('next/server',()=>({after:mocks.after}))
vi.mock('@/lib/observability',()=>({reportError:mocks.reportError}))
import {deferLineNotification} from '../defer'
beforeEach(()=>vi.clearAllMocks())
describe('deferred notification lifecycle',()=>{
  it('registers work with Next and waits for completion inside the callback',async()=>{
    const task=vi.fn().mockResolvedValue(undefined)
    deferLineNotification(task)
    expect(task).not.toHaveBeenCalled()
    expect(mocks.after).toHaveBeenCalledTimes(1)
    await mocks.after.mock.calls[0][0]()
    expect(task).toHaveBeenCalledTimes(1)
  })
  it('reports delivery failure without invalidating the already committed mutation',async()=>{
    const error=new Error('LINE unavailable')
    deferLineNotification(async()=>{throw error})
    await expect(mocks.after.mock.calls[0][0]()).resolves.toBeUndefined()
    expect(mocks.reportError).toHaveBeenCalledWith('line-messaging',error,{fn:'deferred-notification'})
  })
})
