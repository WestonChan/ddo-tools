import { useMemo } from 'react'
import type { LedgerColumnLayout, LedgerSort } from '../../components'
import { usePersistedState } from '../../hooks'
import { isRecord } from '../../lib/isRecord'
import { createPersistedRecordFamily } from '../../lib/persistedState'
import { EMPTY_ITEM_FILTERS, isItemSortColumn, type ItemListFilters } from './queries/items'
import type { ResourceCategory } from '../../lib/resourcePaths'

type OtherResourceCategory = Exclude<ResourceCategory, 'items'>
type OtherResourceFilters = Record<
  string,
  string | string[] | boolean | { min: string; max: string }
>
type ResourceFiltersByCategory = { items: ItemListFilters } & Record<
  OtherResourceCategory,
  OtherResourceFilters
>

export interface ResourceListState<Category extends ResourceCategory> {
  filters: ResourceFiltersByCategory[Category]
  selectedSort: LedgerSort | null
  includesSetBonuses: boolean
  columnOrder: string[]
  columnWidths: Record<string, number>
  searchQuery: string
  scrollTop: number
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

function validatedFilters(
  candidate: unknown,
  category: ResourceCategory,
): ResourceFiltersByCategory[ResourceCategory] | undefined {
  if (category === 'items') return isItemListFilters(candidate) ? candidate : undefined
  return isOtherResourceFilters(candidate) ? candidate : undefined
}

function validatedSort(
  candidate: unknown,
  category: ResourceCategory,
): LedgerSort | null | undefined {
  if (!isStoredSort(candidate)) return undefined
  if (category === 'items' && candidate !== null && !isItemSortColumn(candidate.key))
    return undefined
  return candidate
}

function validatedColumnWidths(candidate: unknown): Record<string, number> | undefined {
  if (!isRecord(candidate)) return undefined
  return Object.fromEntries(
    Object.entries(candidate).filter(
      ([, width]) => typeof width === 'number' && Number.isFinite(width) && width > 0,
    ),
  ) as Record<string, number>
}

const resourceListStateFamily = createPersistedRecordFamily<
  ResourceCategory,
  ResourceListState<ResourceCategory>
>({
  storageKeyFor: (category, storageArea) =>
    storageArea === 'localStorage'
      ? `ddo-tools:resource-list-preferences:${category}`
      : `ddo-tools:resource-list-tab-state:${category}`,
  fields: {
    filters: {
      storageArea: 'localStorage',
      defaultValue: (category) => RESOURCE_LIST_CONFIGURATION[category].filters,
      validatedValue: validatedFilters,
    },
    selectedSort: {
      storageArea: 'localStorage',
      defaultValue: () => null,
      validatedValue: validatedSort,
    },
    includesSetBonuses: {
      storageArea: 'localStorage',
      defaultValue: () => false,
      validatedValue: (candidate) => (typeof candidate === 'boolean' ? candidate : undefined),
    },
    columnOrder: {
      storageArea: 'localStorage',
      defaultValue: () => [],
      validatedValue: (candidate) => (isStringArray(candidate) ? candidate : undefined),
    },
    columnWidths: {
      storageArea: 'localStorage',
      defaultValue: () => ({}),
      validatedValue: validatedColumnWidths,
    },
    searchQuery: {
      storageArea: 'sessionStorage',
      defaultValue: () => '',
      validatedValue: (candidate) => (typeof candidate === 'string' ? candidate : undefined),
    },
    scrollTop: {
      storageArea: 'sessionStorage',
      defaultValue: () => 0,
      validatedValue: (candidate) =>
        typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0
          ? candidate
          : undefined,
    },
  },
})

export function setResourceListState<Category extends ResourceCategory>(
  category: Category,
  change: Partial<ResourceListState<Category>>,
): void {
  resourceListStateFamily(category).save(change)
}

export function useResourceListState<Category extends ResourceCategory>(
  category: Category,
): ResourceListState<Category> {
  return usePersistedState(resourceListStateFamily(category)) as ResourceListState<Category>
}

export function useResourceListColumnLayout(category: ResourceCategory): LedgerColumnLayout {
  const { columnOrder, columnWidths } = useResourceListState(category)
  return useMemo(
    () => ({
      columnOrder,
      onColumnOrderChange: (nextOrder) =>
        setResourceListState(category, { columnOrder: nextOrder }),
      columnWidths,
      onColumnWidthsChange: (nextWidths) =>
        setResourceListState(category, { columnWidths: nextWidths }),
    }),
    [category, columnOrder, columnWidths],
  )
}
