import { describe, it, expect } from 'vitest'
import { selectStylesForDiscovery } from '../selectStylesForDiscovery'
import type { Database } from '@/types/database'

type StyleRow = Database['public']['Tables']['styles']['Row']

function style(partial: Partial<StyleRow> & { slug: string; id: number }): StyleRow {
  return {
    name: partial.slug,
    icon: null,
    name_en: null,
    description: null,
    subtitle: null,
    group_name: null,
    color_profile: null,
    popularity: 0,
    sort_order: partial.id,
    ...partial,
  }
}

describe('selectStylesForDiscovery', () => {
  const catalog = [
    style({ id: 1, slug: 'fine-line' }),
    style({ id: 2, slug: 'floral' }),
    style({ id: 3, slug: 'blackwork' }),
    style({ id: 4, slug: 'lettering' }),
  ]

  it('cold start: returns curated subset and flags isColdStart', () => {
    const { styles, isColdStart } = selectStylesForDiscovery(catalog, new Map())
    expect(isColdStart).toBe(true)
    // floral / lettering preferred over unsplash-only entries in order
    expect(styles.map((s) => s.slug)).toContain('floral')
    expect(styles.map((s) => s.slug)).toContain('lettering')
    expect(styles.length).toBeLessThanOrEqual(12)
  })

  it('with supply: only styles that have artists, sorted by count desc', () => {
    const counts = new Map([
      ['fine-line', 2],
      ['blackwork', 5],
    ])
    const { styles, isColdStart } = selectStylesForDiscovery(catalog, counts)
    expect(isColdStart).toBe(false)
    expect(styles.map((s) => s.slug)).toEqual(['blackwork', 'fine-line'])
    expect(styles.map((s) => s.slug)).not.toContain('floral')
  })
})
