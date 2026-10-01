import type { Message } from '@/types/database'
import { createAdminClient } from '@/lib/supabase/server'

export type AppointmentStatus = 'proposed' | 'confirmed' | 'cancelled'
export interface Appointment {
  notification_message?: Message
  id: string; inquiry_id: string; proposed_by_line_id: string; starts_at: string; location: string
  status: AppointmentStatus; confirmed_at: string | null; cancelled_at: string | null; cancelled_by_line_id: string | null
}
type Result<T> = Promise<{ data: T; error: unknown }>
interface Query { select: (columns: string) => Query; eq: (column: string, value: string) => Query; order: (column: string, options: { ascending: boolean }) => Query; limit: (count: number) => Query; maybeSingle: () => Result<Appointment | null>; single: () => Result<Appointment>; insert: (value: unknown) => Query; update: (value: unknown) => Query }
type Admin = { from: (name: string) => Query; rpc: (name: string, args: Record<string, unknown>) => Result<Appointment | null> }
const db = () => createAdminClient() as unknown as Admin

export async function getAppointment(inquiryId: string): Promise<Appointment | null> {
  const { data, error } = await db().from('appointments').select('*').eq('inquiry_id', inquiryId).order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw error
  return data
}
export async function proposeAppointment(input: Pick<Appointment, 'inquiry_id' | 'proposed_by_line_id' | 'starts_at' | 'location'>) {
  const { data, error } = await db().rpc('propose_appointment_for_accepted_inquiry', { p_inquiry_id: input.inquiry_id, p_proposed_by: input.proposed_by_line_id, p_starts_at: input.starts_at, p_location: input.location })
  if (error) throw error
  return data as Appointment
}
export async function transitionAppointment(id: string, from: 'proposed' | 'confirmed', to: 'confirmed' | 'cancelled', actorId: string) {
  const { data, error } = await db().rpc('transition_appointment', { p_id: id, p_action: to === 'confirmed' ? 'confirm' : 'cancel', p_actor: actorId })
  if (error) throw error
  return data as Appointment | null
}
