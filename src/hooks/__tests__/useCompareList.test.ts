import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCompareList } from '../useCompareList'
import type { CompareArtist } from '../useCompareList'

const makeArtist = (overrides: Partial<CompareArtist> = {}): CompareArtist => ({
  id: 'artist-1',
  display_name: '測試刺青師 A',
  slug: 'artist-a',
  avatar_url: '/avatar-a.jpg',
  ...overrides,
})

describe('useCompareList', () => {
  it('starts with an empty list', () => {
    const { result } = renderHook(() => useCompareList())

    expect(result.current.artists).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('add: appends an artist to the list', () => {
    const { result } = renderHook(() => useCompareList())
    const artist = makeArtist()

    act(() => {
      result.current.add(artist)
    })

    expect(result.current.artists).toHaveLength(1)
    expect(result.current.artists[0].id).toBe('artist-1')
    expect(result.current.count).toBe(1)
  })

  it('add: prevents duplicate artists by id', () => {
    const { result } = renderHook(() => useCompareList())
    const artist = makeArtist()

    act(() => {
      result.current.add(artist)
      result.current.add(artist)
    })

    expect(result.current.artists).toHaveLength(1)
    expect(result.current.count).toBe(1)
  })

  it('add: caps at MAX_COMPARE (3) and silently ignores the fourth', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
      result.current.add(makeArtist({ id: 'a2', slug: 'a2' }))
      result.current.add(makeArtist({ id: 'a3', slug: 'a3' }))
      result.current.add(makeArtist({ id: 'a4', slug: 'a4' }))
    })

    expect(result.current.count).toBe(3)
    expect(result.current.artists.map((a) => a.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('remove: removes the artist with the matching id', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
      result.current.add(makeArtist({ id: 'a2', slug: 'a2' }))
    })

    act(() => {
      result.current.remove('a1')
    })

    expect(result.current.count).toBe(1)
    expect(result.current.artists[0].id).toBe('a2')
  })

  it('remove: is a no-op for an id that does not exist', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
    })

    act(() => {
      result.current.remove('nonexistent-id')
    })

    expect(result.current.count).toBe(1)
  })

  it('clear: empties the entire list', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
      result.current.add(makeArtist({ id: 'a2', slug: 'a2' }))
    })

    act(() => {
      result.current.clear()
    })

    expect(result.current.artists).toEqual([])
    expect(result.current.count).toBe(0)
  })

  it('has: returns true for an id present in the list', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
    })

    expect(result.current.has('a1')).toBe(true)
  })

  it('has: returns false for an id not in the list', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
    })

    expect(result.current.has('a2')).toBe(false)
  })

  it('isFull: is false below max capacity', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
      result.current.add(makeArtist({ id: 'a2', slug: 'a2' }))
    })

    expect(result.current.isFull).toBe(false)
  })

  it('isFull: is true when at max capacity (3)', () => {
    const { result } = renderHook(() => useCompareList())

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
      result.current.add(makeArtist({ id: 'a2', slug: 'a2' }))
      result.current.add(makeArtist({ id: 'a3', slug: 'a3' }))
    })

    expect(result.current.isFull).toBe(true)
  })

  it('count: reflects the current number of artists', () => {
    const { result } = renderHook(() => useCompareList())

    expect(result.current.count).toBe(0)

    act(() => {
      result.current.add(makeArtist({ id: 'a1', slug: 'a1' }))
    })
    expect(result.current.count).toBe(1)

    act(() => {
      result.current.add(makeArtist({ id: 'a2', slug: 'a2' }))
    })
    expect(result.current.count).toBe(2)

    act(() => {
      result.current.remove('a1')
    })
    expect(result.current.count).toBe(1)
  })
})
