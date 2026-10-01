import { deferLineNotification } from '@/lib/line/defer'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { pushNewMessageNotification } from '@/lib/line/messaging'
import { authorizeInquiryAccess, handleApiError, requireAuth } from '@/lib/auth/helpers'
import { getInquiryById } from '@/lib/supabase/queries/inquiries'
import { getAppointment, proposeAppointment, transitionAppointment, type Appointment } from '@/lib/booking/appointments'

const proposalSchema = z.object({
  starts_at: z.string().datetime({ offset: true }).refine(value => Date.parse(value) > Date.now(), 'Choose a future time'),
  location: z.string().trim().min(1).max(300),
})
function publicAppointment(appointment: Appointment | null) {
  if (!appointment) return null
  return { id: appointment.id, inquiry_id: appointment.inquiry_id, starts_at: appointment.starts_at, location: appointment.location, status: appointment.status, confirmed_at: appointment.confirmed_at, cancelled_at: appointment.cancelled_at }
}
async function access(id: string) {
  const user = await requireAuth()
  const inquiry = await getInquiryById(id)
  if (!inquiry) throw new Error('APPOINTMENT_INQUIRY_NOT_FOUND')
  const roles = await authorizeInquiryAccess(user, inquiry)
  return { user, inquiry, ...roles }
}
function failure(error: unknown): NextResponse {
  if (error instanceof Error && error.message === 'APPOINTMENT_INQUIRY_NOT_FOUND') return NextResponse.json({error:'Inquiry not found'},{status:404})
  const code = (error as {code?:string})?.code
  if (code === '23505' || code === '23514' || code === 'P0001') return NextResponse.json({error:'Appointment changed or unavailable. Refresh and try again.'},{status:409})
  return handleApiError(error)
}
export async function GET(_: NextRequest, {params}:{params:Promise<{id:string}>}) {
  try { const {id}=await params; await access(id); return NextResponse.json({appointment:publicAppointment(await getAppointment(id))},{headers:{'Cache-Control':'private, no-store'}}) }
  catch(error){return failure(error)}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params; const result=await access(id)
    if(!result.isArtist || result.artist?.status!=='active' || result.inquiry.status!=='accepted') return NextResponse.json({error:'Only the active artist may propose after quote acceptance'},{status:403})
    const parsed=proposalSchema.safeParse(await request.json().catch(()=>null))
    if(!parsed.success) return NextResponse.json({error:'A future date, time and location are required'},{status:400})
    const appointment=await proposeAppointment({inquiry_id:id,proposed_by_line_id:result.user.lineUserId,starts_at:new Date(parsed.data.starts_at).toISOString(),location:parsed.data.location})
    const message = appointment.notification_message
    if (message) deferLineNotification(() => pushNewMessageNotification(result.inquiry, message, 'artist', result.user.displayName))
    return NextResponse.json({appointment:publicAppointment(appointment)},{status:201})
  }catch(error){return failure(error)}
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  try {
    const {id}=await params; const result=await access(id)
    const parsed=z.object({action:z.enum(['confirm','cancel'])}).safeParse(await request.json().catch(()=>null))
    if(!parsed.success)return NextResponse.json({error:'Invalid action'},{status:400})
    const appointment=await getAppointment(id)
    if(!appointment || appointment.status==='cancelled')return NextResponse.json({error:'No active appointment'},{status:409})
    if(parsed.data.action==='confirm'&&(!result.isConsumer||result.inquiry.status!=='accepted'))return NextResponse.json({error:'Only the consumer can confirm an accepted inquiry'},{status:403})
    const updated=await transitionAppointment(appointment.id,appointment.status,parsed.data.action==='confirm'?'confirmed':'cancelled',result.user.lineUserId)
    if(!updated)return NextResponse.json({error:'Appointment changed; refresh and try again'},{status:409})
    const message = updated.notification_message
    if (message) deferLineNotification(() => pushNewMessageNotification(result.inquiry, message, result.isArtist ? 'artist' : 'consumer', result.user.displayName))
    return NextResponse.json({appointment:publicAppointment(updated)})
  }catch(error){return failure(error)}
}
