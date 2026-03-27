import { formatPrice } from '@/lib/utils'

interface PriceRangeProps {
  min?: number | null
  max?: number | null
}

export function PriceRange({ min, max }: PriceRangeProps) {
  if (min == null && max == null) {
    return <span className="text-sm text-stone-500">價格洽詢</span>
  }

  if (min != null && max != null) {
    return (
      <span className="text-sm font-medium text-stone-900">
        {formatPrice(min)}~{formatPrice(max)}
      </span>
    )
  }

  return (
    <span className="text-sm font-medium text-stone-900">
      {min != null ? `${formatPrice(min)} 起` : `最高 ${formatPrice(max!)}`}
    </span>
  )
}
