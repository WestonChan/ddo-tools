import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  fetchAdventurePackNames,
  fetchAugmentsFittingSlot,
  fetchItem,
  fetchItemIdsInPack,
  fetchItemIdsWithStat,
  fetchItemSummaries,
  fetchStatNames,
  canListFittingAugments,
  type AugmentSummary,
  type ItemAugmentSlot,
  type Item,
  type ItemSummary,
} from './items'

const NEVER_STALE_QUERY_OPTIONS = { staleTime: Infinity, gcTime: 30 * 60 * 1000 } as const

const resourceQueryKeys = {
  itemSummaries: ['items', 'rows'] as const,
  item: (id: number) => ['items', 'detail', id] as const,
  adventurePackNames: ['items', 'packs'] as const,
  statNames: ['items', 'stats'] as const,
  itemIdsWithStat: (statName: string) => ['items', 'by-stat', statName] as const,
  itemIdsInPack: (packName: string) => ['items', 'by-pack', packName] as const,
  augmentsFittingSlot: (slotLabel: string) => ['augments', 'for-slot', slotLabel] as const,
}

export function useItemSummaries(isFetchEnabled = true): UseQueryResult<ItemSummary[]> {
  return useQuery({
    queryKey: resourceQueryKeys.itemSummaries,
    queryFn: fetchItemSummaries,
    enabled: isFetchEnabled,
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

export function useAdventurePackNames(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: resourceQueryKeys.adventurePackNames,
    queryFn: fetchAdventurePackNames,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useStatNames(): UseQueryResult<string[]> {
  return useQuery({
    queryKey: resourceQueryKeys.statNames,
    queryFn: fetchStatNames,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function useItemIdsWithAnyStat(statNames: readonly string[]): Set<number> | null {
  const itemIdQueries = useQueries({
    queries: statNames.map((stat) => ({
      queryKey: resourceQueryKeys.itemIdsWithStat(stat),
      queryFn: () => fetchItemIdsWithStat(stat),
      ...NEVER_STALE_QUERY_OPTIONS,
    })),
  })
  if (statNames.length === 0) return null
  if (itemIdQueries.some((r) => r.data === undefined)) return null
  const union = new Set<number>()
  for (const r of itemIdQueries) for (const id of r.data as Set<number>) union.add(id)
  return union
}

export function useItemIdsInPack(packName: string): Set<number> | null {
  const { data: itemIdsInPack } = useQuery({
    queryKey: resourceQueryKeys.itemIdsInPack(packName),
    queryFn: () => fetchItemIdsInPack(packName),
    enabled: packName !== '',
    ...NEVER_STALE_QUERY_OPTIONS,
  })
  return packName === '' ? null : (itemIdsInPack ?? null)
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
