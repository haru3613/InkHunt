import { z } from 'zod'

export const createArtistSchema = z.object({
  display_name: z.string().min(1).max(100),
  bio: z.string().max(1000).nullable().optional(),
  city: z.string().min(1),
  district: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  price_min: z.number().int().min(0).nullable().optional(),
  price_max: z.number().int().min(0).nullable().optional(),
  ig_handle: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  booking_notice: z.string().nullable().optional(),
  style_ids: z.array(z.number()).default([]),
  // OnboardingWizard sends style slugs (not ids) + these service flags — see
  // src/components/onboarding/OnboardingWizard.tsx handleSubmit(). Without
  // these keys zod's default safeParse silently strips them (HAR-647).
  style_slugs: z.array(z.string()).default([]),
  can_cover: z.boolean().optional(),
  accept_custom: z.boolean().optional(),
  has_flash_designs: z.boolean().optional(),
})
