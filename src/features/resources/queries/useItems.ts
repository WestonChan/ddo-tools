import {
  keepPreviousData,
  useInfiniteQuery,
  useQueries,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { API_HTTP_ERROR, isApiError } from '../../../lib/api'
import {
  canListFittingAugments,
  fetchAdventurePackNames,
  fetchAugmentLootQuests,
  fetchAugmentsFittingSlot,
  fetchEnchantmentNames,
  fetchEquipmentSlotNames,
  fetchItem,
  fetchItemPage,
  itemListParameters,
  fetchRaidQuests,
  type AugmentSummary,
  type Item,
  type ItemAugmentSlot,
  type ItemListFilters,
  type ItemListSort,
  type ItemPage,
  type LootQuest,
  ITEM_PAGE_SIZE,
} from './items'
import { fetchSet, type SetDetail } from './sets'
import { fetchQuest, type QuestDetail } from './quests'

const NEVER_STALE_QUERY_OPTIONS = { staleTime: Infinity, gcTime: 30 * 60 * 1000 } as const

const resourceQueryKeys = {
  itemPage: (
    filters: ItemListFilters,
    searchQuery: string,
    includesSetBonuses: boolean,
    sort: ItemListSort | null,
  ) =>
    [
      'items',
      'page',
      itemListParameters(filters, searchQuery, includesSetBonuses, 0, sort),
    ] as const,
  item: (id: number) => ['items', 'detail', id] as const,
  adventurePackNames: ['items', 'packs'] as const,
  equipmentSlotNames: ['items', 'slots'] as const,
  enchantmentNames: ['items', 'enchantments'] as const,
  augmentsFittingSlot: (slotLabel: string) => ['augments', 'for-slot', slotLabel] as const,
  augmentLootQuests: (augmentId: number) => ['augments', 'loot-quests', augmentId] as const,
  raidQuests: ['quests', 'raids'] as const,
  set: (id: number) => ['sets', 'detail', id] as const,
  quest: (id: number) => ['quests', 'detail', id] as const,
}

export function useItemPage(
  filters: ItemListFilters,
  searchQuery: string,
  includesSetBonuses: boolean,
  sort: ItemListSort | null = null,
): UseInfiniteQueryResult<InfiniteData<ItemPage, number>> {
  return useInfiniteQuery({
    queryKey: resourceQueryKeys.itemPage(filters, searchQuery, includesSetBonuses, sort),
    queryFn: ({ pageParam }) =>
      fetchItemPage(filters, searchQuery, includesSetBonuses, pageParam, sort),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loadedCount = pages.reduce((count, page) => count + page.items.length, 0)
      return lastPage.items.length > 0 && loadedCount < lastPage.total
        ? pages.length * ITEM_PAGE_SIZE
        : undefined
    },
    placeholderData: keepPreviousData,
    retry: (failureCount, error) =>
      failureCount < 2 &&
      isApiError(error) &&
      (error.kind !== API_HTTP_ERROR || error.httpStatus === 429 || error.httpStatus >= 500),
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useItem(id: number | null): UseQueryResult<Item> {
  return useQuery({
    queryKey: resourceQueryKeys.item(id ?? -1),
    queryFn: () => fetchItem(id as number),
    enabled: id !== null,
    retry: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useSet(id: number | null): UseQueryResult<SetDetail> {
  return useQuery({
    queryKey: resourceQueryKeys.set(id ?? -1),
    queryFn: () => fetchSet(id as number),
    enabled: id !== null,
    retry: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useQuest(id: number | null): UseQueryResult<QuestDetail> {
  return useQuery({
    queryKey: resourceQueryKeys.quest(id ?? -1),
    queryFn: () => fetchQuest(id as number),
    enabled: id !== null,
    retry: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useAdventurePackNames(isEnabled = true): UseQueryResult<string[]> {
  return useQuery({
    queryKey: resourceQueryKeys.adventurePackNames,
    queryFn: fetchAdventurePackNames,
    enabled: isEnabled,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useEquipmentSlotNames(isEnabled = true): UseQueryResult<string[]> {
  return useQuery({
    queryKey: resourceQueryKeys.equipmentSlotNames,
    queryFn: fetchEquipmentSlotNames,
    enabled: isEnabled,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useEnchantmentNames(isEnabled = true): UseQueryResult<string[]> {
  return useQuery({
    queryKey: resourceQueryKeys.enchantmentNames,
    queryFn: fetchEnchantmentNames,
    enabled: isEnabled,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useRaidQuests(
  isEnabled = true,
): UseQueryResult<Awaited<ReturnType<typeof fetchRaidQuests>>> {
  return useQuery({
    queryKey: resourceQueryKeys.raidQuests,
    queryFn: fetchRaidQuests,
    enabled: isEnabled,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useFittingAugmentsBySlotLabel(
  augmentSlots: readonly ItemAugmentSlot[],
): Record<string, AugmentSummary[]> {
  const listedSlotLabels = [
    ...new Set(
      augmentSlots.filter((s) => canListFittingAugments(s.family, s.label)).map((s) => s.label),
    ),
  ]
  const augmentQueries = useQueries({
    queries: listedSlotLabels.map((label) => ({
      queryKey: resourceQueryKeys.augmentsFittingSlot(label),
      queryFn: () => fetchAugmentsFittingSlot(label),
      ...NEVER_STALE_QUERY_OPTIONS,
    })),
  })
  const augmentsBySlotLabel: Record<string, AugmentSummary[]> = {}
  listedSlotLabels.forEach((label, i) => {
    const fittingAugments = augmentQueries[i]?.data
    if (fittingAugments) augmentsBySlotLabel[label] = fittingAugments
  })
  return augmentsBySlotLabel
}

export function useAugmentLootQuests(augmentId: number | null): UseQueryResult<LootQuest[]> {
  return useQuery({
    queryKey: resourceQueryKeys.augmentLootQuests(augmentId ?? -1),
    queryFn: () => fetchAugmentLootQuests(augmentId as number),
    enabled: augmentId !== null,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}
