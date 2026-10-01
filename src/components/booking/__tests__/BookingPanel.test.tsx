import {describe,expect,it,vi,beforeEach} from 'vitest'
import {fireEvent,render,screen,waitFor} from '@testing-library/react'
import {BookingPanel} from '../BookingPanel'
vi.mock('next-intl',()=>({useLocale:()=> 'zh-TW'}))
const proposed={id:'a1',starts_at:'2030-01-01T02:00:00.000Z',location:'台北市工作室',status:'proposed'}
const response=(appointment:unknown)=>({ok:true,json:async()=>({appointment})})
beforeEach(()=>vi.unstubAllGlobals())
describe('BookingPanel',()=>{
 it('does not offer appointment actions before quote acceptance',()=>{render(<BookingPanel inquiryId="i1" isArtist inquiryStatus="quoted"/>);expect(screen.queryByText('預約安排')).not.toBeInTheDocument()})
 it('proposes a persisted appointment using explicit Taiwan time',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response(null)).mockResolvedValueOnce(response(proposed));vi.stubGlobal('fetch',fetch)
  render(<BookingPanel inquiryId="i1" isArtist inquiryStatus="accepted"/>);fireEvent.click(screen.getByText('預約安排'))
  fireEvent.change(await screen.findByLabelText('日期時間（台灣時間）'),{target:{value:'2030-01-01T10:00'}});fireEvent.change(screen.getByLabelText('工作室／見面地點'),{target:{value:'台北市工作室'}})
  fireEvent.submit(screen.getByRole('button',{name:'提出預約時間'}).closest('form')!)
  await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(2));expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({starts_at:'2030-01-01T02:00:00.000Z',location:'台北市工作室'});expect(await screen.findByText('台北市工作室')).toBeInTheDocument()
 })
 it('allows consumers to confirm and cancel with honest status',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce(response(proposed)).mockResolvedValueOnce(response({...proposed,status:'confirmed'})).mockResolvedValueOnce(response({...proposed,status:'cancelled'}));vi.stubGlobal('fetch',fetch)
  render(<BookingPanel inquiryId="i1" isArtist={false} inquiryStatus="accepted"/>);fireEvent.click(screen.getByText('預約安排'));fireEvent.click(await screen.findByRole('button',{name:'確認預約'}));await waitFor(()=>expect(screen.getAllByText('預約已確認')).toHaveLength(2));fireEvent.click(screen.getByRole('button',{name:'取消這次安排'}));await waitFor(()=>expect(screen.getAllByText('預約已取消')).toHaveLength(2));expect(screen.queryByRole('button',{name:'確認預約'})).not.toBeInTheDocument()
 })
 it('shows load failure and reloads instead of offering a false empty proposal',async()=>{
  const fetch=vi.fn().mockResolvedValueOnce({ok:false}).mockResolvedValueOnce(response(proposed));vi.stubGlobal('fetch',fetch)
  render(<BookingPanel inquiryId="i1" isArtist={false} inquiryStatus="accepted"/>);fireEvent.click(screen.getByText('預約安排'));expect(await screen.findByRole('alert')).toHaveTextContent('無法更新預約');fireEvent.click(screen.getByRole('button',{name:'重新載入'}));expect(await screen.findByRole('button',{name:'確認預約'})).toBeInTheDocument()
 })
 it('shows cancelled history after inquiry closure',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...proposed,status:'cancelled'})));render(<BookingPanel inquiryId="i1" isArtist={false} inquiryStatus="closed"/>);fireEvent.click(screen.getByText('預約安排'));await waitFor(()=>expect(screen.getAllByText('預約已取消')).toHaveLength(2));expect(screen.queryByRole('button',{name:'確認預約'})).not.toBeInTheDocument()})
})
