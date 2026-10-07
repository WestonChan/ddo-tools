import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { API_HTTP_ERROR, isApiError, shouldRetryQuery } from '../../../lib/api'
import {
  fetchAugment,
  fetchAdventurePackNames,
  fetchAugmentsFittingSlot,
  fetchEffectDetail,
  fetchEffectVocabulary,
  fetchEquipmentSlotNames,
  fetchItem,
  fetchItemPage,
  itemListParameters,
  fetchRaidQuests,
  type AugmentSummary,
  type AugmentDetail,
  type Item,
  type ItemListFilters,
  type ItemListSort,
  type ItemPage,
  ITEM_PAGE_SIZE,
} from './items'
import { fetchSet, fetchSetVocabulary, type SetDetail } from './sets'
import { fetchQuest, type QuestDetail } from './quests'
import {
  fetchAdventurePack,
  fetchQuestChain,
  fetchSaga,
  fetchCraftingSystem,
  fetchVendor,
  fetchEvent,
  type SourceDetail,
} from './sources'

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
  effectVocabulary: (searchQuery: string) => ['effects', 'vocabulary', searchQuery] as const,
  effectDetail: (detailPath: string) => ['effects', 'detail', detailPath] as const,
  augmentsFittingSlot: (slotLabel: string) => ['augments', 'for-slot', slotLabel] as const,
  augment: (id: number) => ['augments', 'detail', id] as const,
  raidQuests: ['quests', 'raids'] as const,
  setVocabulary: (searchQuery: string) => ['sets', 'vocabulary', searchQuery] as const,
  set: (id: number) => ['sets', 'detail', id] as const,
  quest: (id: number) => ['quests', 'detail', id] as const,
  source: (kind: string, id: number) => ['sources', kind, id] as const,
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
      shouldRetryQuery(failureCount, error) &&
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

export function useSetVocabulary(
  searchQuery: string,
  isEnabled = true,
): UseQueryResult<Awaited<ReturnType<typeof fetchSetVocabulary>>> {
  return useQuery({
    queryKey: resourceQueryKeys.setVocabulary(searchQuery),
    queryFn: () => fetchSetVocabulary(searchQuery),
    enabled: isEnabled,
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

export function useEffectVocabulary(
  searchQuery: string,
  isEnabled = true,
): UseQueryResult<Awaited<ReturnType<typeof fetchEffectVocabulary>>> {
  return useQuery({
    queryKey: resourceQueryKeys.effectVocabulary(searchQuery),
    queryFn: () => fetchEffectVocabulary(searchQuery),
    enabled: isEnabled,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useEffectDetail(
  detailPath: string,
  isEnabled = true,
): UseQueryResult<Awaited<ReturnType<typeof fetchEffectDetail>>> {
  return useQuery({
    queryKey: resourceQueryKeys.effectDetail(detailPath),
    queryFn: () => fetchEffectDetail(detailPath),
    enabled: isEnabled,
    retry: false,
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
  slotLabel: string | null,
): UseQueryResult<AugmentSummary[]> {
  return useQuery({
    queryKey: resourceQueryKeys.augmentsFittingSlot(slotLabel ?? ''),
    queryFn: () => fetchAugmentsFittingSlot(slotLabel as string),
    enabled: slotLabel !== null,
    retry: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useAugment(id: number | null): UseQueryResult<AugmentDetail> {
  return useQuery({
    queryKey: resourceQueryKeys.augment(id ?? -1),
    queryFn: () => fetchAugment(id as number),
    enabled: id !== null,
    retry: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

function useSourceDetail(
  kind: SourceDetail['kind'],
  id: number,
  fetchSource: (id: number) => Promise<SourceDetail>,
): UseQueryResult<SourceDetail> {
  return useQuery({
    queryKey: resourceQueryKeys.source(kind, id),
    queryFn: () => fetchSource(id),
    retry: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useAdventurePack(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('adventurePack', id, fetchAdventurePack)
}

export function useQuestChain(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('questChain', id, fetchQuestChain)
}

export function useSaga(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('saga', id, fetchSaga)
}

export function useCraftingSystem(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('craftingSystem', id, fetchCraftingSystem)
}

export function useVendor(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('vendor', id, fetchVendor)
}

export function useEvent(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('event', id, fetchEvent)
}
