'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { CalendarDays } from 'lucide-react'
import type { Inquiry } from '@/types/database'
import type { Appointment } from '@/lib/booking/appointments'

type PublicAppointment = Omit<Appointment, 'proposed_by_line_id' | 'cancelled_by_line_id'>
export function BookingPanel({inquiryId,isArtist,inquiryStatus}:{inquiryId:string;isArtist:boolean;inquiryStatus?:Inquiry['status']}) {
  const en=useLocale()==='en'
  const [loaded,setLoaded]=useState(false)
  const [appointment,setAppointment]=useState<PublicAppointment|null>(null)
  const [error,setError]=useState(''),[loading,setLoading]=useState(true),[pending,setPending]=useState(false)
  const inFlight=useRef(false),version=useRef(0)
  const relevant=inquiryStatus==='accepted'||inquiryStatus==='closed'
  const load=useCallback(async()=>{
    if(inFlight.current)return
    const current=++version.current
    try {
      const response=await fetch(`/api/inquiries/${inquiryId}/appointment`)
      if(!response.ok)throw new Error('load')
      const payload=await response.json()
      if(current===version.current){setAppointment(payload.appointment);setLoaded(true);setError('')}
    }catch{if(current===version.current)setError(en?'Could not refresh the appointment. Please retry.':'無法更新預約，請重試。')}
    finally{if(current===version.current)setLoading(false)}
  },[en,inquiryId])
  useEffect(()=>{
    if(!relevant)return
    const initial=setTimeout(()=>{void load()},0)
    const refresh=()=>{if(document.visibilityState==='visible')void load()}
    const interval=setInterval(refresh,15000)
    document.addEventListener('visibilitychange',refresh)
    return()=>{++version.current;clearTimeout(initial);clearInterval(interval);document.removeEventListener('visibilitychange',refresh)}
  },[relevant,load])
  const mutate=async(method:'POST'|'PATCH',body:unknown)=>{
    if(inFlight.current)return
    inFlight.current=true;++version.current;setPending(true);setError('')
    try{
      const response=await fetch(`/api/inquiries/${inquiryId}/appointment`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      if(!response.ok)throw new Error('mutation')
      setAppointment((await response.json()).appointment);setLoaded(true)
    }catch{setError(en?'Could not save. Check the details and try again.':'儲存失敗，請確認資料後重試。')}
    finally{inFlight.current=false;setPending(false)}
  }
  const propose=(event:React.FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    const values=new FormData(event.currentTarget)
    const local=String(values.get('starts_at'))
    // The field is explicitly labelled Taipei time, independent of browser timezone.
    const date=new Date(`${local.length===16?`${local}:00`:local}+08:00`)
    if(!Number.isFinite(date.getTime())||date.getTime()<=Date.now()){setError(en?'Choose a future date and time.':'請選擇未來的日期與時間。');return}
    void mutate('POST',{starts_at:date.toISOString(),location:String(values.get('location')).trim()})
  }
  if(!relevant)return null
  const active=appointment&&appointment.status!=='cancelled'
  const statusLabel=appointment?.status==='confirmed'?(en?'Confirmed':'預約已確認'):appointment?.status==='proposed'?(en?'Awaiting confirmation':'等待確認'):appointment?.status==='cancelled'?(en?'Cancelled':'預約已取消'):(en?'Arrange a time':'安排時間')
  return <details className="my-2 rounded-lg border border-border bg-card">
    <summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-sm font-medium"><CalendarDays size={17} className="text-primary"/>{en?'Appointment':'預約安排'}<span className="ml-auto text-xs text-primary" aria-live="polite">{statusLabel}</span></summary>
    <div className="max-h-[35dvh] space-y-3 overflow-y-auto border-t border-border p-4 text-sm">
      {loading?<p role="status">{en?'Loading…':'載入中…'}</p>:<>
        {appointment&&<div><p className="font-semibold">{statusLabel}</p><p className="mt-2">{new Intl.DateTimeFormat(en?'en-US':'zh-TW',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Taipei'}).format(new Date(appointment.starts_at))} {en?'(Taipei)':'（台灣時間）'}</p><p className="mt-1 whitespace-pre-wrap">{appointment.location}</p></div>}
        {active&&inquiryStatus==='accepted'&&<div className="flex flex-wrap items-center gap-3">{appointment.status==='proposed'&&!isArtist&&<button disabled={pending} className="v2-button" onClick={()=>void mutate('PATCH',{action:'confirm'})}>{en?'Confirm appointment':'確認預約'}</button>}<button disabled={pending} className="min-h-11 text-muted-foreground underline underline-offset-4" onClick={()=>void mutate('PATCH',{action:'cancel'})}>{en?'Cancel this arrangement':'取消這次安排'}</button></div>}
        {loaded&&!active&&isArtist&&inquiryStatus==='accepted'&&<form onSubmit={propose} className="grid gap-3"><label className="grid gap-1.5">{en?'Date and time (Taipei)':'日期時間（台灣時間）'}<input required name="starts_at" type="datetime-local" className="v2-select w-full"/></label><label className="grid gap-1.5">{en?'Studio / meeting location':'工作室／見面地點'}<input required name="location" maxLength={300} className="v2-select w-full" placeholder={en?'Address and studio name':'請填寫地址與工作室名稱'}/></label><button disabled={pending} className="v2-button">{pending?(en?'Sending…':'傳送中…'):(en?'Propose appointment':'提出預約時間')}</button></form>}
        {loaded&&!active&&!isArtist&&inquiryStatus==='accepted'&&<p className="text-muted-foreground">{en?'Your artist can propose a time here.':'刺青師可以在這裡提出預約時間。'}</p>}
        <p className="text-xs leading-6 text-muted-foreground">{en?'The platform is free. Please agree on design, preparation, deposits and any cancellation terms directly with your artist.':'平台不收費。設計、事前準備、訂金與取消約定，請和刺青師確認。'}</p>
      </>}
      {error&&<div role="alert" className="text-destructive">{error} <button className="min-h-11 underline" onClick={()=>void load()}>{en?'Reload':'重新載入'}</button></div>}
    </div>
  </details>
}
