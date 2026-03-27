import type { Artist, Style } from './database'

export interface ArtistWithDetails extends Artist {
  styles: Style[]
  portfolio_count?: number
}

export type ArtistStatus = 'pending' | 'active' | 'suspended'

export const STATUS_LABELS: Record<ArtistStatus, string> = {
  pending: '待審核',
  active: '已上線',
  suspended: '停權',
}

export const STATUS_COLORS: Record<ArtistStatus, { bg: string; text: string }> = {
  pending: { bg: 'bg-[#C8A97E]/15', text: 'text-[#C8A97E]' },
  active: { bg: 'bg-[#4ade80]/15', text: 'text-[#4ade80]' },
  suspended: { bg: 'bg-[#f87171]/15', text: 'text-[#f87171]' },
}
