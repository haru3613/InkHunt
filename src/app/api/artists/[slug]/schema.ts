import { z } from 'zod'

export const updateArtistSchema = z
  .object({
    display_name: z.string().min(1).max(100).optional(),
    bio: z.string().max(1000).nullable().optional(),
    city: z.string().min(1).optional(),
    district: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    price_min: z.number().int().min(0).nullable().optional(),
    price_max: z.number().int().min(0).nullable().optional(),
    ig_handle: z.string().nullable().optional(),
    pricing_note: z.string().nullable().optional(),
    booking_notice: z.string().nullable().optional(),
    style_ids: z.array(z.number()).optional(),
  })
  .refine(
    (data) => {
      if (data.price_min != null && data.price_max != null) {
        return data.price_min <= data.price_max
      }
      return true
    },
    { message: 'price_min must be less than or equal to price_max' },
  )
