import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetPersistedStateForTests } from '../../lib/persistedState'
import type { ResourceCategory } from '../../lib/resourcePaths'
import { itemListParameters } from './queries/items'
import { setResourceListState, useResourceListState } from './resourceListState'

const ITEMS_PREFERENCES_KEY = 'ddo-tools:resource-list-preferences:items'
const ITEMS_TAB_STATE_KEY = 'ddo-tools:resource-list-tab-state:items'
const FEATS_PREFERENCES_KEY = 'ddo-tools:resource-list-preferences:feats'
const FEATS_TAB_STATE_KEY = 'ddo-tools:resource-list-tab-state:feats'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function writeSampleStates(): void {
  const items = renderHook(() => useResourceListState('items'))
  act(() => {
    setResourceListState('items', {
      filters: {
        ...items.result.current.filters,
        ml: { min: '20', max: '32' },
        slot: ['Back'],
        bonuses: ['Constitution:Insightful', 'Sheltering'],
        bonusMatch: 'all',
        set: ['Adherent of the Mists', 'Part of the Family'],
        setMatch: 'all',
        pack: ['Ravenloft', 'Sharn'],
      },
      searchQuery: 'stone',
      selectedSort: { key: 'name', direction: 'asc' },
      includesSetBonuses: true,
      scrollTop: 120,
    })
    setResourceListState('feats', {
      filters: { tier: 'legendary' },
      searchQuery: 'wild',
      selectedSort: { key: 'name', direction: 'desc' },
      scrollTop: 40,
    })
  })
  items.unmount()
}

interface StoredEntry<Value> {
  version: number
  value: Value
}

interface StoredPreferences {
  filters: StoredEntry<Record<string, unknown>>
  selectedSort: StoredEntry<Record<string, unknown>>
  includesSetBonuses: StoredEntry<unknown>
}

function startNewTab(): void {
  sessionStorage.clear()
  resetPersistedStateForTests()
}

describe('resource list state', () => {
  it('keeps each category independent through writes and a storage round trip', () => {
    const items = renderHook(() => useResourceListState('items'))
    const feats = renderHook(() => useResourceListState('feats'))
    act(() => {
      setResourceListState('items', { searchQuery: 'stone', scrollTop: 120 })
      setResourceListState('feats', { searchQuery: 'wild', scrollTop: 40 })
    })
    expect(items.result.current.searchQuery).toBe('stone')
    expect(feats.result.current.searchQuery).toBe('wild')
    items.unmount()
    feats.unmount()

    resetPersistedStateForTests()
    const restoredItems = renderHook(() => useResourceListState('items'))
    const restoredFeats = renderHook(() => useResourceListState('feats'))
    expect(restoredItems.result.current).toMatchObject({ searchQuery: 'stone', scrollTop: 120 })
    expect(restoredFeats.result.current).toMatchObject({ searchQuery: 'wild', scrollTop: 40 })
    const switchingCategory = renderHook(
      ({ category }: { category: ResourceCategory }) => useResourceListState(category),
      { initialProps: { category: 'items' as ResourceCategory } },
    )
    expect(switchingCategory.result.current.searchQuery).toBe('stone')
    switchingCategory.rerender({ category: 'feats' })
    expect(switchingCategory.result.current.searchQuery).toBe('wild')
    act(() => {
      setResourceListState('feats', { searchQuery: 'fey' })
    })
    expect(restoredItems.result.current.searchQuery).toBe('stone')
    expect(restoredFeats.result.current.searchQuery).toBe('fey')
  })

  it('restores every field after a reload of the same tab', () => {
    writeSampleStates()
    resetPersistedStateForTests()
    const restoredItems = renderHook(() => useResourceListState('items'))
    const restoredFeats = renderHook(() => useResourceListState('feats'))
    expect(restoredItems.result.current).toMatchObject({
      filters: {
        ml: { min: '20', max: '32' },
        slot: ['Back'],
        bonuses: ['Constitution:Insightful', 'Sheltering'],
        bonusMatch: 'all',
        set: ['Adherent of the Mists', 'Part of the Family'],
        setMatch: 'all',
        pack: ['Ravenloft', 'Sharn'],
      },
      searchQuery: 'stone',
      selectedSort: { key: 'name', direction: 'asc' },
      includesSetBonuses: true,
      scrollTop: 120,
    })
    expect(
      itemListParameters(
        restoredItems.result.current.filters,
        restoredItems.result.current.searchQuery,
        restoredItems.result.current.includesSetBonuses,
        0,
        restoredItems.result.current.selectedSort,
      ),
    ).toMatchObject({
      q: 'stone',
      min_level: '20',
      max_level: '32',
      slot: ['Back'],
      pack: ['Ravenloft', 'Sharn'],
      sort: ['name'],
    })
    expect(restoredFeats.result.current).toMatchObject({
      filters: { tier: 'legendary' },
      searchQuery: 'wild',
      selectedSort: { key: 'name', direction: 'desc' },
      scrollTop: 40,
    })
  })

  it('keeps filters, sort and the set-bonuses toggle in a new tab, and starts search and scroll clean', () => {
    writeSampleStates()
    startNewTab()
    const items = renderHook(() => useResourceListState('items'))
    const feats = renderHook(() => useResourceListState('feats'))
    expect(items.result.current).toMatchObject({
      filters: { ml: { min: '20', max: '32' }, slot: ['Back'] },
      selectedSort: { key: 'name', direction: 'asc' },
      includesSetBonuses: true,
      searchQuery: '',
      scrollTop: 0,
    })
    expect(feats.result.current).toMatchObject({
      filters: { tier: 'legendary' },
      selectedSort: { key: 'name', direction: 'desc' },
      searchQuery: '',
      scrollTop: 0,
    })
  })

  it('leaves both stored keys of a category byte-identical when another category is written', () => {
    writeSampleStates()
    const preferencesBefore = localStorage.getItem(ITEMS_PREFERENCES_KEY)
    const tabStateBefore = sessionStorage.getItem(ITEMS_TAB_STATE_KEY)
    expect(preferencesBefore).not.toBeNull()
    expect(tabStateBefore).not.toBeNull()

    act(() => {
      setResourceListState('feats', { searchQuery: 'fey', filters: { tier: 'epic' } })
    })

    expect(localStorage.getItem(ITEMS_PREFERENCES_KEY)).toBe(preferencesBefore)
    expect(sessionStorage.getItem(ITEMS_TAB_STATE_KEY)).toBe(tabStateBefore)
  })

  it('writes scroll only to the tab state and filters only to the preferences', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    act(() => setResourceListState('items', { scrollTop: 50 }))
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([ITEMS_TAB_STATE_KEY])
    setItem.mockClear()
    act(() => setResourceListState('items', { includesSetBonuses: true }))
    expect(setItem.mock.calls.map(([key]) => key)).toEqual([ITEMS_PREFERENCES_KEY])
  })

  it('ignores the key the previous version wrote for the whole tab', () => {
    sessionStorage.setItem(
      'ddo-tools:resource-list-sessions:v1',
      JSON.stringify({
        version: 2,
        sessions: { items: { searchQuery: 'old', includesSetBonuses: true } },
      }),
    )
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current).toMatchObject({ searchQuery: '', includesSetBonuses: false })
  })

  function corruptedPreferences(change: (stored: StoredPreferences) => void): void {
    writeSampleStates()
    const stored = JSON.parse(localStorage.getItem(ITEMS_PREFERENCES_KEY)!)
    change(stored)
    localStorage.setItem(ITEMS_PREFERENCES_KEY, JSON.stringify(stored))
    resetPersistedStateForTests()
  }

  it('uses the default filters for a filters entry written by an older version, keeping the sort', () => {
    corruptedPreferences((stored) => {
      stored.filters.version = 0
      stored.filters.value.raid = ['6263613332164767']
    })
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current.filters.raid).toEqual([])
    expect(itemListParameters(result.current.filters, '', false).quest).toBeUndefined()
    expect(result.current.selectedSort).toEqual({ key: 'name', direction: 'asc' })
  })

  it('uses the default filters for numeric raid values, keeping the sort', () => {
    corruptedPreferences((stored) => {
      stored.filters.value.raid = [6263613332164767]
    })
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current.filters.raid).toEqual([])
    expect(result.current.selectedSort).toEqual({ key: 'name', direction: 'asc' })
  })

  it('uses the default filters for a filters value of the wrong shape, keeping the sort', () => {
    corruptedPreferences((stored) => {
      stored.filters.value = { slot: 'Back' }
    })
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current.filters.slot).toEqual([])
    expect(result.current.selectedSort).toEqual({ key: 'name', direction: 'asc' })
  })

  it('discards a stored items sort that the items API cannot use', () => {
    corruptedPreferences((stored) => {
      stored.selectedSort.value.key = 'unknown'
    })
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current.selectedSort).toBeNull()
  })

  it('uses the default toggle for a value that is not a boolean', () => {
    corruptedPreferences((stored) => {
      stored.includesSetBonuses.value = 'yes'
    })
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current.includesSetBonuses).toBe(false)
  })

  it('uses defaults for broken preferences JSON and keeps the tab state', () => {
    writeSampleStates()
    localStorage.setItem(ITEMS_PREFERENCES_KEY, '{broken json')
    resetPersistedStateForTests()
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current).toMatchObject({
      filters: { bonuses: [], bonusMatch: 'any', set: [], setMatch: 'any' },
      selectedSort: null,
      includesSetBonuses: false,
      searchQuery: 'stone',
      scrollTop: 120,
    })
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY, 'far'])(
    'uses scroll 0 for a stored scroll of %s',
    (storedScroll) => {
      writeSampleStates()
      const stored = JSON.parse(sessionStorage.getItem(ITEMS_TAB_STATE_KEY)!)
      stored.scrollTop.value = storedScroll
      sessionStorage.setItem(ITEMS_TAB_STATE_KEY, JSON.stringify(stored))
      resetPersistedStateForTests()
      const { result } = renderHook(() => useResourceListState('items'))
      expect(result.current.scrollTop).toBe(0)
      expect(result.current.searchQuery).toBe('stone')
    },
  )

  it('gives defaults and a setter that does not throw when storage refuses everything', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    const { result } = renderHook(() => useResourceListState('items'))
    expect(result.current).toMatchObject({ searchQuery: '', scrollTop: 0, selectedSort: null })
    expect(() => act(() => setResourceListState('items', { searchQuery: 'stone' }))).not.toThrow()
    expect(result.current.searchQuery).toBe('stone')
  })

  it('does not write a stored key for a category nobody changed', () => {
    renderHook(() => useResourceListState('feats'))
    expect(localStorage.getItem(FEATS_PREFERENCES_KEY)).toBeNull()
    expect(sessionStorage.getItem(FEATS_TAB_STATE_KEY)).toBeNull()
  })
})
