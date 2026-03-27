'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { Artist, Style } from '@/types/database'

interface ProfileFormProps {
  readonly artist: Artist | null
  readonly styles: Style[]
  readonly selectedStyleIds: number[]
}

interface FormState {
  display_name: string
  bio: string
  city: string
  district: string
  address: string
  price_min: string
  price_max: string
  ig_handle: string
  pricing_note: string
  booking_notice: string
  style_ids: number[]
}

export function ProfileForm({ artist, styles, selectedStyleIds }: ProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [form, setForm] = useState<FormState>({
    display_name: artist?.display_name ?? '',
    bio: artist?.bio ?? '',
    city: artist?.city ?? '',
    district: artist?.district ?? '',
    address: artist?.address ?? '',
    price_min: artist?.price_min?.toString() ?? '',
    price_max: artist?.price_max?.toString() ?? '',
    ig_handle: artist?.ig_handle ?? '',
    pricing_note: artist?.pricing_note ?? '',
    booking_notice: artist?.booking_notice ?? '',
    style_ids: selectedStyleIds,
  })

  const handleChange = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setMessage(null)
  }, [])

  const toggleStyle = useCallback((styleId: number) => {
    setForm((prev) => ({
      ...prev,
      style_ids: prev.style_ids.includes(styleId)
        ? prev.style_ids.filter((id) => id !== styleId)
        : [...prev.style_ids, styleId],
    }))
  }, [])

  const handleSubmit = useCallback(async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      const endpoint = artist ? `/api/artists/${artist.slug}` : '/api/artists'
      const method = artist ? 'PATCH' : 'POST'

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: form.display_name,
          bio: form.bio || null,
          city: form.city,
          district: form.district || null,
          address: form.address || null,
          price_min: form.price_min ? Number(form.price_min) : null,
          price_max: form.price_max ? Number(form.price_max) : null,
          ig_handle: form.ig_handle || null,
          pricing_note: form.pricing_note || null,
          booking_notice: form.booking_notice || null,
          style_ids: form.style_ids,
        }),
      })

      if (!response.ok) throw new Error('Save failed')
      setMessage({ type: 'success', text: artist ? '已儲存' : '申請已送出，等待審核' })
    } catch {
      setMessage({ type: 'error', text: '儲存失敗，請重試' })
    } finally {
      setIsSaving(false)
    }
  }, [artist, form])

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); handleSubmit() }}
      className="space-y-6 max-w-2xl"
    >
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">顯示名稱 <span className="text-red-500">*</span></label>
        <Input value={form.display_name} onChange={(e) => handleChange('display_name', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" required />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">自我介紹</label>
        <Textarea value={form.bio} onChange={(e) => handleChange('bio', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB] min-h-24" placeholder="介紹你的風格、經歷、理念..." />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#F5F0EB]">城市 <span className="text-red-500">*</span></label>
          <Input value={form.city} onChange={(e) => handleChange('city', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="台北市" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-[#F5F0EB]">區域</label>
          <Input value={form.district} onChange={(e) => handleChange('district', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="大安區" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">地址</label>
        <Input value={form.address} onChange={(e) => handleChange('address', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="詳細地址（選填）" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">價格範圍 (NTD)</label>
        <div className="flex items-center gap-2">
          <Input type="number" value={form.price_min} onChange={(e) => handleChange('price_min', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="最低" min={0} />
          <span className="text-[#F5F0EB]/40">~</span>
          <Input type="number" value={form.price_max} onChange={(e) => handleChange('price_max', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="最高" min={0} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">價格備註</label>
        <Input value={form.pricing_note} onChange={(e) => handleChange('pricing_note', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="例：依大小、複雜度報價" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">Instagram</label>
        <Input value={form.ig_handle} onChange={(e) => handleChange('ig_handle', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB]" placeholder="@yourtattoo" />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">預約須知</label>
        <Textarea value={form.booking_notice} onChange={(e) => handleChange('booking_notice', e.target.value)} className="bg-[#141414] border-[#1F1F1F] text-[#F5F0EB] min-h-20" placeholder="預約流程、注意事項..." />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-[#F5F0EB]">擅長風格</label>
        <div className="flex flex-wrap gap-2">
          {styles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => toggleStyle(style.id)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                form.style_ids.includes(style.id)
                  ? 'bg-[#C8A97E] text-[#0A0A0A]'
                  : 'bg-[#1F1F1F] text-[#F5F0EB]/60 hover:text-[#F5F0EB]'
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <div className={`text-sm ${message.type === 'success' ? 'text-green-500' : 'text-red-400'}`}>
          {message.text}
        </div>
      )}
      <Button type="submit" disabled={isSaving} className="bg-[#C8A97E] text-[#0A0A0A] hover:bg-[#C8A97E]/90 px-8">
        {isSaving ? '儲存中...' : (artist ? '儲存' : '提交申請')}
      </Button>
    </form>
  )
}
