'use client'

import { useRouter } from 'next/navigation'
import { redirect } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'

export default function ArtistEntryPage() {
  const { isLoading, isLoggedIn, artist, loginWithRedirect } = useAuth()
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-[#F5F0EB]/60">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-4 gap-6">
        <h1 className="text-2xl font-semibold text-[#F5F0EB]">刺青師後台</h1>
        <p className="text-[#F5F0EB]/60 text-center max-w-md">
          使用 LINE 登入來管理你的作品集、回覆詢價、接收報價
        </p>
        <Button
          onClick={() => loginWithRedirect('/artist')}
          className="bg-[#06C755] hover:bg-[#06C755]/90 text-white px-8"
          size="lg"
        >
          LINE 登入
        </Button>
      </div>
    )
  }

  if (artist?.status === 'active') {
    redirect('/artist/dashboard')
  }

  if (artist?.status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-4 gap-4">
        <h1 className="text-2xl font-semibold text-[#F5F0EB]">申請審核中</h1>
        <p className="text-[#F5F0EB]/60 text-center max-w-md">
          你的刺青師帳號正在審核中，審核通過後即可使用後台功能
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] px-4 gap-6">
      <h1 className="text-2xl font-semibold text-[#F5F0EB]">成為 InkHunt 刺青師</h1>
      <p className="text-[#F5F0EB]/60 text-center max-w-md">
        填寫你的資料，申請成為平台刺青師，展示作品接收詢價
      </p>
      <Button
        onClick={() => router.push('/artist/profile')}
        className="bg-[#C8A97E] hover:bg-[#C8A97E]/90 text-[#0A0A0A] px-8"
        size="lg"
      >
        開始申請
      </Button>
    </div>
  )
}
