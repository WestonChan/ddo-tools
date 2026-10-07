import {
  keepPreviousData,
  queryOptions,
  useInfiniteQuery,
  useQuery,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  type QueryClient,
  type QueryKey,
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

type DetailQueryOptions<Result, Key extends QueryKey> = ReturnType<
  typeof queryOptions<Result, Error, Result, Key>
>

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

const itemDetailQueryOptions = (
  id: number,
): DetailQueryOptions<Item, ReturnType<typeof resourceQueryKeys.item>> =>
  queryOptions({
    queryKey: resourceQueryKeys.item(id),
    queryFn: () => fetchItem(id),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const setDetailQueryOptions = (
  id: number,
): DetailQueryOptions<SetDetail, ReturnType<typeof resourceQueryKeys.set>> =>
  queryOptions({
    queryKey: resourceQueryKeys.set(id),
    queryFn: () => fetchSet(id),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const questDetailQueryOptions = (
  id: number,
): DetailQueryOptions<QuestDetail, ReturnType<typeof resourceQueryKeys.quest>> =>
  queryOptions({
    queryKey: resourceQueryKeys.quest(id),
    queryFn: () => fetchQuest(id),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const effectDetailQueryOptions = (
  detailPath: string,
): DetailQueryOptions<
  Awaited<ReturnType<typeof fetchEffectDetail>>,
  ReturnType<typeof resourceQueryKeys.effectDetail>
> =>
  queryOptions({
    queryKey: resourceQueryKeys.effectDetail(detailPath),
    queryFn: () => fetchEffectDetail(detailPath),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const augmentDetailQueryOptions = (
  id: number,
): DetailQueryOptions<AugmentDetail, ReturnType<typeof resourceQueryKeys.augment>> =>
  queryOptions({
    queryKey: resourceQueryKeys.augment(id),
    queryFn: () => fetchAugment(id),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

const sourceDetailFetchers = {
  adventurePack: fetchAdventurePack,
  questChain: fetchQuestChain,
  saga: fetchSaga,
  craftingSystem: fetchCraftingSystem,
  vendor: fetchVendor,
  event: fetchEvent,
} satisfies Record<SourceDetail['kind'], (id: number) => Promise<SourceDetail>>

export const sourceDetailQueryOptions = (
  kind: SourceDetail['kind'],
  id: number,
): DetailQueryOptions<SourceDetail, ReturnType<typeof resourceQueryKeys.source>> =>
  queryOptions({
    queryKey: resourceQueryKeys.source(kind, id),
    queryFn: () => sourceDetailFetchers[kind](id),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

function itemCardSetQueryOptions(item: Item): ReturnType<typeof setDetailQueryOptions> | null {
  return item.setId === null ? null : setDetailQueryOptions(item.setId)
}

export function isDetailQueryReady(
  queryClient: QueryClient,
  detailQuery: { queryKey: QueryKey },
): boolean {
  const status = queryClient.getQueryState(detailQuery.queryKey)?.status
  return status === 'success' || status === 'error'
}

export async function prefetchItemCard(queryClient: QueryClient, id: number): Promise<void> {
  const item = await queryClient.ensureQueryData(itemDetailQueryOptions(id))
  const setOptions = itemCardSetQueryOptions(item)
  if (setOptions) void queryClient.prefetchQuery(setOptions)
}

export function isItemCardReady(queryClient: QueryClient, id: number): boolean {
  return isDetailQueryReady(queryClient, itemDetailQueryOptions(id))
}

export function prefetchEffect(
  queryClient: QueryClient,
  id: number,
): Promise<Awaited<ReturnType<typeof fetchEffectDetail>>> {
  return queryClient.ensureQueryData(effectDetailQueryOptions(`/v1/effects/${id}`))
}

export function isEffectReady(queryClient: QueryClient, id: number): boolean {
  return isDetailQueryReady(queryClient, effectDetailQueryOptions(`/v1/effects/${id}`))
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
    ...itemDetailQueryOptions(id ?? -1),
    enabled: id !== null,
  })
}

export function useSet(id: number | null): UseQueryResult<SetDetail> {
  return useQuery({
    ...setDetailQueryOptions(id ?? -1),
    enabled: id !== null,
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
    ...questDetailQueryOptions(id ?? -1),
    enabled: id !== null,
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
    ...effectDetailQueryOptions(detailPath),
    enabled: isEnabled,
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
    ...augmentDetailQueryOptions(id ?? -1),
    enabled: id !== null,
  })
}

function useSourceDetail(kind: SourceDetail['kind'], id: number): UseQueryResult<SourceDetail> {
  return useQuery(sourceDetailQueryOptions(kind, id))
}

export function useAdventurePack(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('adventurePack', id)
}

export function useQuestChain(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('questChain', id)
}

export function useSaga(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('saga', id)
}

export function useCraftingSystem(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('craftingSystem', id)
}

export function useVendor(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('vendor', id)
}

export function useEvent(id: number): UseQueryResult<SourceDetail> {
  return useSourceDetail('event', id)
}
