'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

export function useRealtimeMessages(inquiryId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const sendingRef = useRef(false)
  const requestVersion = useRef(0)

  const fetchMessages = useCallback(async () => {
    if (!inquiryId) return
    const version = ++requestVersion.current
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/messages`)
      if (!response.ok) throw new Error('Unable to load conversation')
      const data = await response.json()
      if (version !== requestVersion.current) return
      setMessages(data.messages ?? [])
      setError(false)
    } catch {
      if (version === requestVersion.current) setError(true)
    } finally {
      if (version === requestVersion.current) setIsLoading(false)
    }
  }, [inquiryId])

  useEffect(() => {
    const initial = setTimeout(() => { void fetchMessages() }, 0)
    // Reconcile status updates and recover from a dropped realtime connection.
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void fetchMessages() }, 15000)
    const refresh = () => { if (document.visibilityState === 'visible') void fetchMessages() }
    document.addEventListener('visibilitychange', refresh)
    return () => { ++requestVersion.current; clearTimeout(initial); clearInterval(timer); document.removeEventListener('visibilitychange', refresh) }
  }, [fetchMessages])

  useEffect(() => {
    if (!inquiryId) return
    const supabase = createClient()
    const channel = supabase.channel(`inquiry:${inquiryId}`).on('postgres_changes', {
      event: '*', schema: 'public', table: 'messages', filter: `inquiry_id=eq.${inquiryId}`,
    }, payload => {
      const incoming = payload.new as Message
      // Quote events contain creation snapshots; the API hydrates live status.
      if (!incoming.id || incoming.message_type === 'quote') { void fetchMessages(); return }
      setMessages(previous => previous.some(item => item.id === incoming.id)
        ? previous.map(item => item.id === incoming.id ? incoming : item)
        : [...previous, incoming])
    }).subscribe()
    return () => { void supabase.removeChannel(channel) }
  }, [inquiryId, fetchMessages])

  const sendMessage = useCallback(async (messageType: 'text' | 'image', content: string) => {
    if (!inquiryId) throw new Error('No conversation selected')
    if (sendingRef.current) throw new Error('A message is already being sent')
    sendingRef.current = true
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_type: messageType, content }),
      })
      if (!response.ok) throw new Error('Failed to send message')
      const saved: Message = await response.json()
      setMessages(prev => prev.some(m => m.id === saved.id) ? prev : [...prev, saved])
    } finally { sendingRef.current = false }
  }, [inquiryId])

  return { messages, isLoading, error, sendMessage, refetch: fetchMessages }
}
