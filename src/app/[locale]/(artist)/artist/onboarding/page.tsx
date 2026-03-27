'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default function OnboardingPage() {
  const { isLoading, isLoggedIn, user, artist } = useAuth()
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
      <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
        <div className="text-[#F5F0EB]/40">Loading...</div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto w-full max-w-lg">
        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-xs font-medium tracking-widest text-[#C8A97E] uppercase">
            InkHunt
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-[#F5F0EB]">
            建立你的刺青師檔案
          </h1>
        </div>

        <OnboardingWizard prefillName={user?.displayName ?? ''} />
      </div>
    </div>
  )
}
