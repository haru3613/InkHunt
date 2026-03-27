import { z } from 'zod'

export const inquirySchema = z.object({
  description: z.string().min(10, '請至少描述 10 個字').max(1000, '描述不能超過 1000 字'),
  body_part: z.string().min(1, '請選擇刺青部位'),
  size_estimate: z.string().min(1, '請填寫預計大小'),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional(),
  reference_images: z.array(z.string()).max(3, '最多上傳 3 張參考圖').default([]),
}).refine(
  (data) => !data.budget_min || !data.budget_max || data.budget_min <= data.budget_max,
  { message: '最低預算不能超過最高預算', path: ['budget_min'] },
)

export type InquiryFormData = z.infer<typeof inquirySchema>

export const BODY_PARTS = [
  '手臂（上臂）', '手臂（前臂）', '手腕',
  '腿部（大腿）', '腿部（小腿）', '腳踝',
  '背部', '胸部', '肩膀', '頸部', '手指', '腹部', '其他',
] as const
