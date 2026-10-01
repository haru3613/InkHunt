'use client'

import { useEffect } from 'react'
// HAR-667: locale-aware router — bare next/navigation drops the locale segment.
import { useRouter } from '@/i18n/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  const { isLoading, isLoggedIn, user, artist, refetch } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn) {
      router.replace('/artist')
      return
    }
    if (artist?.status === 'active') {
      router.replace('/artist/dashboard')
    }
  }, [isLoading, isLoggedIn, artist, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F2]">
        <div role="status" className="text-muted-foreground">正在確認登入狀態…</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F7F6F2] px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-[#20241F]">
            建立你的刺青師檔案
          </h1>
        </div>

        {user && <OnboardingWizard
          key={user.lineUserId}
          accountId={user.lineUserId}
          prefillName={user.displayName}
          initialArtistSlug={artist?.slug}
          recoverExistingProfile={async () => {
            const refreshed = await refetch()
            return refreshed?.user?.lineUserId === user.lineUserId ? refreshed.artist?.slug ?? null : null
          }}
          onProfileCreated={async (slug) => {
            const refreshed = await refetch()
            if (refreshed?.user?.lineUserId !== user.lineUserId || refreshed.artist?.slug !== slug) {
              throw new Error('申請已保存，但帳號狀態尚未更新。請重試同步，不會重複建立申請。')
            }
          }}
        />}
      </div>
    </div>
  )
}
