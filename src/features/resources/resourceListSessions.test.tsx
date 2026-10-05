import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resetResourceListSessionsForTests,
  setResourceListSession,
  useResourceListSession,
} from './resourceListSessions'
import type { ResourceCategory } from './resourceCategories'

const STORAGE_KEY = 'ddo-tools:resource-list-sessions:v1'

beforeEach(() => {
  sessionStorage.clear()
  resetResourceListSessionsForTests()
})

afterEach(cleanup)

describe('resource list sessions', () => {
  it('keeps each category independent through writes and a storage round trip', () => {
    const items = renderHook(() => useResourceListSession('items'))
    const sets = renderHook(() => useResourceListSession('sets'))
    act(() => {
      setResourceListSession('items', {
        filters: {
          ...items.result.current.filters,
          ml: { min: '20', max: '32' },
          enchantments: ['Strength'],
          enchantmentMatch: 'all',
        },
        searchQuery: 'stone',
        selectedSort: { key: 'name', direction: 'asc' },
        includesSetBonuses: true,
        scrollTop: 120,
      })
      setResourceListSession('sets', {
        filters: { tier: 'legendary' },
        searchQuery: 'wild',
        selectedSort: { key: 'name', direction: 'desc' },
        scrollTop: 40,
      })
    })
    expect(items.result.current.searchQuery).toBe('stone')
    expect(sets.result.current.searchQuery).toBe('wild')
    items.unmount()
    sets.unmount()

    resetResourceListSessionsForTests()
    const restoredItems = renderHook(() => useResourceListSession('items'))
    const restoredSets = renderHook(() => useResourceListSession('sets'))
    expect(restoredItems.result.current).toMatchObject({
      filters: {
        ml: { min: '20', max: '32' },
        enchantments: ['Strength'],
        enchantmentMatch: 'all',
      },
      searchQuery: 'stone',
      selectedSort: { key: 'name', direction: 'asc' },
      includesSetBonuses: true,
      scrollTop: 120,
    })
    expect(restoredSets.result.current).toMatchObject({
      filters: { tier: 'legendary' },
      searchQuery: 'wild',
      selectedSort: { key: 'name', direction: 'desc' },
      scrollTop: 40,
    })
    const switchingCategory = renderHook(
      ({ category }: { category: ResourceCategory }) => useResourceListSession(category),
      { initialProps: { category: 'items' as ResourceCategory } },
    )
    expect(switchingCategory.result.current.searchQuery).toBe('stone')
    switchingCategory.rerender({ category: 'sets' })
    expect(switchingCategory.result.current.searchQuery).toBe('wild')
    switchingCategory.rerender({ category: 'items' })
    expect(switchingCategory.result.current.searchQuery).toBe('stone')
    act(() => {
      setResourceListSession('sets', { searchQuery: 'fey' })
    })
    expect(restoredItems.result.current.searchQuery).toBe('stone')
    expect(restoredSets.result.current.searchQuery).toBe('fey')
  })

  it.each([
    '{broken json',
    JSON.stringify({ version: 0, sessions: { items: { searchQuery: 'old' } } }),
    JSON.stringify({ version: 1, sessions: { items: { searchQuery: 'partial' } } }),
  ])('uses defaults for a malformed or older stored entry', (entry) => {
    sessionStorage.setItem(STORAGE_KEY, entry)
    const { result } = renderHook(() => useResourceListSession('items'))
    expect(result.current).toMatchObject({
      filters: { enchantments: [], enchantmentMatch: 'any' },
      searchQuery: '',
      selectedSort: null,
      includesSetBonuses: false,
      scrollTop: 0,
    })
  })

  it('discards a stored items sort that the items API cannot use', () => {
    const items = renderHook(() => useResourceListSession('items'))
    act(() => setResourceListSession('items', { selectedSort: { key: 'ml', direction: 'desc' } }))
    items.unmount()
    const storedEntry = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)
    storedEntry.sessions.items.selectedSort.key = 'unknown'
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(storedEntry))
    resetResourceListSessionsForTests()
    const restoredItems = renderHook(() => useResourceListSession('items'))
    expect(restoredItems.result.current.selectedSort).toBeNull()
  })
})
