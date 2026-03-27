'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

function ValueCard({
  icon,
  title,
  description,
}: {
  icon: string
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#1F1F1F] bg-[#141414] p-5">
      <span className="text-2xl font-bold text-[#C8A97E]">{icon}</span>
      <h3 className="font-semibold text-[#F5F0EB]">{title}</h3>
      <p className="text-sm leading-relaxed text-[#F5F0EB]/60">{description}</p>
    </div>
  )
}

function PendingScreen() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#C8A97E]/30 bg-[#141414]">
          <span className="text-2xl">&#10003;</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F5F0EB]">
          申請審核中
        </h1>
        <p className="text-[#F5F0EB]/60">
          你的刺青師帳號正在審核中，我們會在 1-2 個工作天內完成審核。審核通過後即可使用後台功能。
        </p>
      </div>
    </div>
  )
}

function LandingScreen({
  onLogin,
}: {
  onLogin: () => void
}) {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 pb-16 pt-20 text-center sm:pt-28">
        <p className="mb-4 text-sm font-medium tracking-widest text-[#C8A97E] uppercase">
          for tattoo artists
        </p>
        <h1 className="mb-4 text-3xl font-bold tracking-tight text-[#F5F0EB] sm:text-4xl lg:text-5xl">
          在 InkHunt 展示你的作品
        </h1>
        <p className="mb-8 max-w-md text-base leading-relaxed text-[#F5F0EB]/60">
          免費建立作品集、接收詢價，讓客人主動找到你。
        </p>
        <Button
          onClick={onLogin}
          className="h-12 rounded-lg px-8 text-base font-semibold text-white"
          style={{ backgroundColor: '#06C755' }}
        >
          LINE 登入開始建立
        </Button>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-3xl px-4 pb-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ValueCard
            icon="01"
            title="免費曝光"
            description="你的作品會出現在風格搜尋結果中，讓有需求的客人直接找到你。"
          />
          <ValueCard
            icon="02"
            title="輕鬆接案"
            description="客人直接填寫需求，帶著預算來找你，省去來回溝通的時間。"
          />
          <ValueCard
            icon="03"
            title="專業形象"
            description="一頁式作品集，比 IG 更專業，讓客人一眼看到你的風格與實力。"
          />
        </div>
      </section>
    </div>
  )
}

export default function ArtistEntryPage() {
  const { isLoading, isLoggedIn, artist, loginWithRedirect } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn) return
    if (!artist) {
      router.push('/artist/onboarding')
      return
    }
    if (artist.status === 'active') {
      router.push('/artist/dashboard')
    }
  }, [isLoading, isLoggedIn, artist, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-[#F5F0EB]/40">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return <LandingScreen onLogin={() => loginWithRedirect('/artist')} />
  }

  if (artist?.status === 'pending') {
    return <PendingScreen />
  }

  // Redirecting (active or no artist record) — show minimal loading
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <div className="text-[#F5F0EB]/40">Loading...</div>
    </div>
  )
}
