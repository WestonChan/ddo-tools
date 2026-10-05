import { useCallback, useSyncExternalStore } from 'react'
import type { LedgerSort } from '../../components'
import { EMPTY_ITEM_FILTERS, isItemSortColumn, type ItemListFilters } from './queries/items'
import { RESOURCE_CATEGORIES, type ResourceCategory } from './resourceCategories'

type OtherResourceCategory = Exclude<ResourceCategory, 'items'>
type OtherResourceFilters = Record<
  string,
  string | string[] | boolean | { min: string; max: string }
>
type ResourceFiltersByCategory = { items: ItemListFilters } & Record<
  OtherResourceCategory,
  OtherResourceFilters
>

export interface ResourceListSession<Category extends ResourceCategory> {
  filters: ResourceFiltersByCategory[Category]
  searchQuery: string
  selectedSort: LedgerSort | null
  includesSetBonuses: boolean
  scrollTop: number
}

type ResourceListSessions = {
  [Category in ResourceCategory]: ResourceListSession<Category>
}

interface ResourceListConfiguration<Category extends ResourceCategory> {
  filters: ResourceFiltersByCategory[Category]
  initialSort: LedgerSort | null
}

const EMPTY_OTHER_FILTERS: OtherResourceFilters = {}
export const RESOURCE_LIST_CONFIGURATION: {
  [Category in ResourceCategory]: ResourceListConfiguration<Category>
} = {
  stats: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
  enchantments: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
  items: { filters: EMPTY_ITEM_FILTERS, initialSort: { key: 'ml', direction: 'desc' } },
  feats: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
  enhancements: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
  spells: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
  augments: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
  sets: { filters: EMPTY_OTHER_FILTERS, initialSort: null },
}

const RESOURCE_LIST_SESSIONS_STORAGE_KEY = 'ddo-tools:resource-list-sessions:v1'
const RESOURCE_LIST_SESSIONS_VERSION = 1
let currentSessions: ResourceListSessions | null = null
const sessionListeners = new Map<ResourceCategory, Set<() => void>>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isRange(value: unknown): value is { min: string; max: string } {
  return isRecord(value) && typeof value.min === 'string' && typeof value.max === 'string'
}

function isOtherResourceFilters(value: unknown): value is OtherResourceFilters {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (filter) =>
        typeof filter === 'string' ||
        typeof filter === 'boolean' ||
        isStringArray(filter) ||
        isRange(filter),
    )
  )
}

function isItemListFilters(value: unknown): value is ItemListFilters {
  return (
    isRecord(value) &&
    isRange(value.ml) &&
    isStringArray(value.slot) &&
    isStringArray(value.bonuses) &&
    (value.bonusMatch === 'any' || value.bonusMatch === 'all') &&
    isStringArray(value.set) &&
    (value.setMatch === 'any' || value.setMatch === 'all') &&
    isStringArray(value.pack) &&
    isStringArray(value.raid) &&
    typeof value.isRareOnly === 'boolean' &&
    typeof value.isRaidOnly === 'boolean'
  )
}

function isStoredSort(value: unknown): value is LedgerSort | null {
  return (
    value === null ||
    (isRecord(value) &&
      typeof value.key === 'string' &&
      value.key.length > 0 &&
      (value.direction === 'asc' || value.direction === 'desc'))
  )
}

function isStoredSession<Category extends ResourceCategory>(
  category: Category,
  value: unknown,
): value is ResourceListSession<Category> {
  return (
    isRecord(value) &&
    (category === 'items'
      ? isItemListFilters(value.filters)
      : isOtherResourceFilters(value.filters)) &&
    typeof value.searchQuery === 'string' &&
    isStoredSort(value.selectedSort) &&
    (category !== 'items' ||
      value.selectedSort === null ||
      isItemSortColumn(value.selectedSort.key)) &&
    typeof value.includesSetBonuses === 'boolean' &&
    typeof value.scrollTop === 'number' &&
    Number.isFinite(value.scrollTop) &&
    value.scrollTop >= 0
  )
}

function defaultSessions(): ResourceListSessions {
  return Object.fromEntries(
    RESOURCE_CATEGORIES.map((category) => [
      category,
      {
        filters: RESOURCE_LIST_CONFIGURATION[category].filters,
        searchQuery: '',
        selectedSort: null,
        includesSetBonuses: false,
        scrollTop: 0,
      },
    ]),
  ) as ResourceListSessions
}

function storedSessions(): ResourceListSessions {
  const defaults = defaultSessions()
  try {
    const storedText = sessionStorage.getItem(RESOURCE_LIST_SESSIONS_STORAGE_KEY)
    if (!storedText) return defaults
    const storedEntry: unknown = JSON.parse(storedText)
    if (!isRecord(storedEntry) || storedEntry.version !== RESOURCE_LIST_SESSIONS_VERSION)
      return defaults
    if (!isRecord(storedEntry.sessions)) return defaults
    for (const category of RESOURCE_CATEGORIES) {
      const storedSession = storedEntry.sessions[category]
      if (isStoredSession(category, storedSession)) {
        Object.assign(defaults, { [category]: storedSession })
      }
    }
  } catch {
    return defaults
  }
  return defaults
}

function resourceListSessions(): ResourceListSessions {
  currentSessions ??= storedSessions()
  return currentSessions
}

function resourceListSession<Category extends ResourceCategory>(
  category: Category,
): ResourceListSession<Category> {
  return resourceListSessions()[category]
}

function subscribeToResourceListSession(
  category: ResourceCategory,
  listener: () => void,
): () => void {
  const listeners = sessionListeners.get(category) ?? new Set<() => void>()
  listeners.add(listener)
  sessionListeners.set(category, listeners)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) sessionListeners.delete(category)
  }
}

function saveResourceListSessions(sessions: ResourceListSessions): void {
  try {
    sessionStorage.setItem(
      RESOURCE_LIST_SESSIONS_STORAGE_KEY,
      JSON.stringify({ version: RESOURCE_LIST_SESSIONS_VERSION, sessions }),
    )
  } catch {
    return
  }
}

export function setResourceListSession<Category extends ResourceCategory>(
  category: Category,
  change: Partial<ResourceListSession<Category>>,
): void {
  const sessions = resourceListSessions()
  const previousSession = sessions[category]
  const nextSession = { ...previousSession, ...change }
  currentSessions = { ...sessions, [category]: nextSession }
  saveResourceListSessions(currentSessions)
  sessionListeners.get(category)?.forEach((listener) => listener())
}

export function useResourceListSession<Category extends ResourceCategory>(
  category: Category,
): ResourceListSession<Category> {
  const subscribe = useCallback(
    (listener: () => void) => subscribeToResourceListSession(category, listener),
    [category],
  )
  const snapshot = useCallback(() => resourceListSession(category), [category])
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}

export function resetResourceListSessionsForTests(): void {
  currentSessions = null
  sessionListeners.forEach((listeners) => listeners.forEach((listener) => listener()))
}
