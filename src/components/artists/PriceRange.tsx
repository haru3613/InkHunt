import { getTranslations } from 'next-intl/server'
import { formatPrice } from '@/lib/utils'

interface PriceRangeProps {
  min?: number | null
  max?: number | null
}

export async function PriceRange({ min, max }: PriceRangeProps) {
  const t = await getTranslations('artistProfile')

  if (min == null && max == null) {
    return <span className="text-sm text-muted-foreground">{t('priceInquiry')}</span>
  }

  if (min != null && max != null) {
    return (
      <span className="text-sm font-medium text-foreground">
        {formatPrice(min)}~{formatPrice(max)}
      </span>
    )
  }

  return (
    <span className="text-sm font-medium text-foreground">
      {min != null ? `${formatPrice(min)} 起` : `最高 ${formatPrice(max!)}`}
    </span>
  )
}
