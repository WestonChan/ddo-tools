import {
  keepPreviousData,
  queryOptions,
  skipToken,
  useInfiniteQuery,
  useQuery,
  useQueries,
  type InfiniteData,
  type UseInfiniteQueryResult,
  type UseQueryResult,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query'
import { type Slug, API_HTTP_ERROR, isApiError, shouldRetryQuery } from '../../../lib/api'
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
  item: (slug: Slug | null) => ['items', 'detail', slug] as const,
  adventurePackNames: ['items', 'packs'] as const,
  equipmentSlotNames: ['items', 'slots'] as const,
  effectVocabulary: (searchQuery: string) => ['effects', 'vocabulary', searchQuery] as const,
  effectDetail: (slug: Slug | null) => ['effects', 'detail', slug] as const,
  augmentsFittingSlot: (slotLabel: string) => ['augments', 'for-slot', slotLabel] as const,
  augment: (slug: Slug | null) => ['augments', 'detail', slug] as const,
  raidQuests: ['quests', 'raids'] as const,
  setVocabulary: (searchQuery: string) => ['sets', 'vocabulary', searchQuery] as const,
  set: (slug: Slug | null) => ['sets', 'detail', slug] as const,
  quest: (slug: Slug | null) => ['quests', 'detail', slug] as const,
  source: (kind: string, slug: Slug) => ['sources', kind, slug] as const,
}

export const fittingAugmentsQueryKey = resourceQueryKeys.augmentsFittingSlot

export const itemDetailQueryOptions = (
  slug: Slug | null,
): DetailQueryOptions<Item, ReturnType<typeof resourceQueryKeys.item>> =>
  queryOptions({
    queryKey: resourceQueryKeys.item(slug),
    queryFn: slug === null ? skipToken : () => fetchItem(slug),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const setDetailQueryOptions = (
  slug: Slug | null,
): DetailQueryOptions<SetDetail, ReturnType<typeof resourceQueryKeys.set>> =>
  queryOptions({
    queryKey: resourceQueryKeys.set(slug),
    queryFn: slug === null ? skipToken : () => fetchSet(slug),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const questDetailQueryOptions = (
  slug: Slug | null,
): DetailQueryOptions<QuestDetail, ReturnType<typeof resourceQueryKeys.quest>> =>
  queryOptions({
    queryKey: resourceQueryKeys.quest(slug),
    queryFn: slug === null ? skipToken : () => fetchQuest(slug),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const effectDetailQueryOptions = (
  slug: Slug | null,
): DetailQueryOptions<
  Awaited<ReturnType<typeof fetchEffectDetail>>,
  ReturnType<typeof resourceQueryKeys.effectDetail>
> =>
  queryOptions({
    queryKey: resourceQueryKeys.effectDetail(slug),
    queryFn: slug === null ? skipToken : () => fetchEffectDetail(slug),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

export const augmentDetailQueryOptions = (
  slug: Slug | null,
): DetailQueryOptions<AugmentDetail, ReturnType<typeof resourceQueryKeys.augment>> =>
  queryOptions({
    queryKey: resourceQueryKeys.augment(slug),
    queryFn: slug === null ? skipToken : () => fetchAugment(slug),
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
} satisfies Record<SourceDetail['kind'], (slug: Slug) => Promise<SourceDetail>>

export const sourceDetailQueryOptions = (
  kind: SourceDetail['kind'],
  slug: Slug,
): DetailQueryOptions<SourceDetail, ReturnType<typeof resourceQueryKeys.source>> =>
  queryOptions({
    queryKey: resourceQueryKeys.source(kind, slug),
    queryFn: () => sourceDetailFetchers[kind](slug),
    retry: false,
    retryOnMount: false,
    ...NEVER_STALE_QUERY_OPTIONS,
  })

function itemCardSetQueryOptions(
  slugs: readonly Slug[],
): ReturnType<typeof setDetailQueryOptions>[] {
  return slugs.map(setDetailQueryOptions)
}

export function isDetailQueryReady(
  queryClient: QueryClient,
  detailQuery: { queryKey: QueryKey },
): boolean {
  const status = queryClient.getQueryState(detailQuery.queryKey)?.status
  return status === 'success' || status === 'error'
}

export async function prefetchItemCard(queryClient: QueryClient, slug: Slug): Promise<void> {
  const item = await queryClient.ensureQueryData(itemDetailQueryOptions(slug))
  await Promise.allSettled(
    itemCardSetQueryOptions(item.sets.map((set) => set.slug)).map((options) =>
      queryClient.prefetchQuery(options),
    ),
  )
}

export function isItemCardReady(queryClient: QueryClient, slug: Slug): boolean {
  if (!isDetailQueryReady(queryClient, itemDetailQueryOptions(slug))) return false
  const item = queryClient.getQueryData(itemDetailQueryOptions(slug).queryKey)
  return (
    !item ||
    itemCardSetQueryOptions(item.sets.map((set) => set.slug)).every((options) =>
      isDetailQueryReady(queryClient, options),
    )
  )
}

export function prefetchEffect(
  queryClient: QueryClient,
  slug: Slug,
): Promise<Awaited<ReturnType<typeof fetchEffectDetail>>> {
  return queryClient.ensureQueryData(effectDetailQueryOptions(slug))
}

export function isEffectReady(queryClient: QueryClient, slug: Slug): boolean {
  return isDetailQueryReady(queryClient, effectDetailQueryOptions(slug))
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

export function useItem(slug: Slug | null): UseQueryResult<Item> {
  return useQuery({
    ...itemDetailQueryOptions(slug),
    enabled: slug !== null,
  })
}

export function useSets(slugs: readonly Slug[]): UseQueryResult<SetDetail>[] {
  return useQueries({ queries: itemCardSetQueryOptions(slugs) })
}

export function useSet(slug: Slug | null): UseQueryResult<SetDetail> {
  return useQuery({
    ...setDetailQueryOptions(slug),
    enabled: slug !== null,
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

export function useQuest(slug: Slug | null): UseQueryResult<QuestDetail> {
  return useQuery({
    ...questDetailQueryOptions(slug),
    enabled: slug !== null,
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
  slug: Slug | null,
  isEnabled = true,
): UseQueryResult<Awaited<ReturnType<typeof fetchEffectDetail>>> {
  return useQuery({
    ...effectDetailQueryOptions(slug),
    enabled: isEnabled && slug !== null,
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

export function useAugment(slug: Slug | null): UseQueryResult<AugmentDetail> {
  return useQuery({
    ...augmentDetailQueryOptions(slug),
    enabled: slug !== null,
  })
}

function useSourceDetail(kind: SourceDetail['kind'], slug: Slug): UseQueryResult<SourceDetail> {
  return useQuery(sourceDetailQueryOptions(kind, slug))
}

export function useAdventurePack(slug: Slug): UseQueryResult<SourceDetail> {
  return useSourceDetail('adventurePack', slug)
}

export function useQuestChain(slug: Slug): UseQueryResult<SourceDetail> {
  return useSourceDetail('questChain', slug)
}

export function useSaga(slug: Slug): UseQueryResult<SourceDetail> {
  return useSourceDetail('saga', slug)
}

export function useCraftingSystem(slug: Slug): UseQueryResult<SourceDetail> {
  return useSourceDetail('craftingSystem', slug)
}

export function useVendor(slug: Slug): UseQueryResult<SourceDetail> {
  return useSourceDetail('vendor', slug)
}

export function useEvent(slug: Slug): UseQueryResult<SourceDetail> {
  return useSourceDetail('event', slug)
}
