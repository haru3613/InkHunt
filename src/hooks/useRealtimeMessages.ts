'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Message } from '@/types/database'

export function useRealtimeMessages(inquiryId: string | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const sendingRef = useRef(false)

  const fetchMessages = useCallback(async () => {
    if (!inquiryId) return
    setIsLoading(true)
    try {
      const response = await fetch(`/api/inquiries/${inquiryId}/messages`)
      const data = await response.json()
      setMessages(data.messages ?? [])
    } catch {
      // Fetch failed silently; messages remain as-is
    } finally {
      setIsLoading(false)
    }
  }, [inquiryId])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    if (!inquiryId) return

    const supabase = createClient()
    const channel = supabase
      .channel(`inquiry:${inquiryId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `inquiry_id=eq.${inquiryId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev
            return [...prev, newMessage]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [inquiryId])

  const sendMessage = useCallback(
    async (messageType: 'text' | 'image', content: string) => {
      if (!inquiryId || sendingRef.current) return
      sendingRef.current = true
      try {
        const response = await fetch(`/api/inquiries/${inquiryId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message_type: messageType, content }),
        })

        if (!response.ok) throw new Error('Failed to send message')

        const saved: Message = await response.json()
        setMessages((prev) => {
          if (prev.some((m) => m.id === saved.id)) return prev
          return [...prev, saved]
        })
      } finally {
        sendingRef.current = false
      }
    },
    [inquiryId],
  )

  return { messages, isLoading, sendMessage, refetch: fetchMessages }
}
