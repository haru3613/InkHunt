import { z } from 'zod'

export const quoteRequestSchema = z.object({
  artist_ids: z.array(z.string().uuid()).min(1, 'Select at least 1 artist').max(3, 'Maximum 3 artists'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(1000),
  reference_images: z.array(z.string().url()).max(3).default([]),
  body_part: z.string().min(1, 'Body part is required'),
  size_estimate: z.string().min(1, 'Size estimate is required'),
  budget_min: z.number().int().min(0).optional(),
  budget_max: z.number().int().min(0).optional(),
}).refine(
  (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
  { message: 'Minimum budget cannot exceed maximum budget', path: ['budget_min'] },
)

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>
