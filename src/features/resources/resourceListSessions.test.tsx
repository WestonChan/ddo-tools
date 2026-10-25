import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  resetResourceListSessionsForTests,
  setResourceListSession,
  useResourceListSession,
} from './resourceListSessions'
import type { ResourceCategory } from '../../lib/resourcePaths'
import { itemListParameters } from './queries/items'

const STORAGE_KEY = 'ddo-tools:resource-list-sessions:v1'

beforeEach(() => {
  sessionStorage.clear()
  resetResourceListSessionsForTests()
})

afterEach(cleanup)

describe('resource list sessions', () => {
  it('drops the previous version written with numeric raid values', () => {
    const session = renderHook(() => useResourceListSession('items'))
    act(() =>
      setResourceListSession('items', {
        filters: { ...session.result.current.filters, raid: ['6263613332164767'] },
      }),
    )
    session.unmount()
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!)
    stored.version = 1
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    resetResourceListSessionsForTests()
    const restored = renderHook(() => useResourceListSession('items'))
    expect(restored.result.current.filters.raid).toEqual([])
    expect(itemListParameters(restored.result.current.filters, '', false).quest).toBeUndefined()
  })
  it('keeps each category independent through writes and a storage round trip', () => {
    const items = renderHook(() => useResourceListSession('items'))
    const feats = renderHook(() => useResourceListSession('feats'))
    act(() => {
      setResourceListSession('items', {
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
      setResourceListSession('feats', {
        filters: { tier: 'legendary' },
        searchQuery: 'wild',
        selectedSort: { key: 'name', direction: 'desc' },
        scrollTop: 40,
      })
    })
    expect(items.result.current.searchQuery).toBe('stone')
    expect(feats.result.current.searchQuery).toBe('wild')
    items.unmount()
    feats.unmount()

    resetResourceListSessionsForTests()
    const restoredItems = renderHook(() => useResourceListSession('items'))
    const restoredFeats = renderHook(() => useResourceListSession('feats'))
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
      bonus: ['Constitution:Insightful', 'Sheltering'],
      bonus_match: 'all',
      set: ['Adherent of the Mists', 'Part of the Family'],
      set_match: 'all',
      pack: ['Ravenloft', 'Sharn'],
      sort: ['name'],
    })
    expect(restoredFeats.result.current).toMatchObject({
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
    switchingCategory.rerender({ category: 'feats' })
    expect(switchingCategory.result.current.searchQuery).toBe('wild')
    switchingCategory.rerender({ category: 'items' })
    expect(switchingCategory.result.current.searchQuery).toBe('stone')
    act(() => {
      setResourceListSession('feats', { searchQuery: 'fey' })
    })
    expect(restoredItems.result.current.searchQuery).toBe('stone')
    expect(restoredFeats.result.current.searchQuery).toBe('fey')
  })

  it.each([
    '{broken json',
    JSON.stringify({ version: 0, sessions: { items: { searchQuery: 'old' } } }),
    JSON.stringify({ version: 1, sessions: { items: { searchQuery: 'partial' } } }),
  ])('uses defaults for a malformed or older stored entry', (entry) => {
    sessionStorage.setItem(STORAGE_KEY, entry)
    const { result } = renderHook(() => useResourceListSession('items'))
    expect(result.current).toMatchObject({
      filters: { bonuses: [], bonusMatch: 'any', set: [], setMatch: 'any' },
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
