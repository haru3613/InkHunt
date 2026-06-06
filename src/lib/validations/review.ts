import { z } from 'zod'

export const reviewSchema = z.object({
  rating: z.number().int().min(1, '評分至少 1 顆星').max(5, '評分最多 5 顆星'),
  comment: z.string().trim().max(1000, '評論不能超過 1000 字').optional(),
  artistId: z.string().uuid('刺青師 ID 格式錯誤'),
})

export type ReviewInput = z.infer<typeof reviewSchema>
