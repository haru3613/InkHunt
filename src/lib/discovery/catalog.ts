export const SUBJECTS = [
  { value: 'botanical', zh: '植物花卉', en: 'Botanical', words: ['花', '植物', '葉', 'flower', 'botanical', 'floral'] },
  { value: 'animals', zh: '動物', en: 'Animals', words: ['貓', '虎', '蛇', '鳥', '動物', 'animal', 'tiger', 'cat', 'snake', 'wolf'] },
  { value: 'lettering', zh: '文字', en: 'Lettering', words: ['字', 'letter', 'script'] },
  { value: 'geometric', zh: '幾何', en: 'Geometric', words: ['幾何', '線條', 'geometric', 'mandala'] },
  { value: 'japanese', zh: '日式', en: 'Japanese', words: ['日式', '龍', '鯉', 'japanese', 'dragon', 'koi'] },
] as const
export const CITIES = ['台北市','新北市','桃園市','台中市','台南市','高雄市','基隆市','新竹市','嘉義市','新竹縣','苗栗縣','彰化縣','南投縣','雲林縣','嘉義縣','屏東縣','宜蘭縣','花蓮縣','台東縣','澎湖縣','金門縣','連江縣'] as const
export function parseExploreFilters(input: Record<string, string | string[] | undefined>) {
  const one = (key: string) => typeof input[key] === 'string' ? input[key] as string : ''
  const subject = SUBJECTS.find(x => x.value === one('subject'))
  const city = CITIES.find(x => x === one('city'))
  const style = /^[a-z0-9-]{1,64}$/.test(one('style')) ? one('style') : ''
  const rawPage = Number(one('page'))
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1
  return { subject, city, style, page }
}

/** Let visitors meet several creators before repeating a portfolio. */
export function diverseWorks<T extends { artists: { id: string } }>(works: T[], limit = 8): T[] {
  const groups = new Map<string, T[]>()
  for (const work of works) groups.set(work.artists.id, [...(groups.get(work.artists.id) ?? []), work])
  const result: T[] = []
  for (let round = 0; result.length < limit; round++) {
    let added = false
    for (const group of groups.values()) {
      if (group[round] && result.length < limit) { result.push(group[round]); added = true }
    }
    if (!added) break
  }
  return result
}
