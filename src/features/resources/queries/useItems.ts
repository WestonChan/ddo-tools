import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  fetchAdventurePacks,
  fetchAugmentsForSlot,
  fetchItemDetail,
  fetchItemIdsByPack,
  fetchItemIdsByStat,
  fetchItemRows,
  fetchStatOptions,
  slotTakesCandidateList,
  type AugmentCandidate,
  type ItemAugmentSlot,
  type ItemDetail,
  type ItemRow,
} from './items'


const FOREVER = { staleTime: Infinity, gcTime: 30 * 60 * 1000 } as const

export const itemKeys = {
  rows: ['items', 'rows'] as const,
  detail: (id: number) => ['items', 'detail', id] as const,
  packs: ['items', 'packs'] as const,
  stats: ['items', 'stats'] as const,
  byStat: (stat: string) => ['items', 'by-stat', stat] as const,
  byPack: (pack: string) => ['items', 'by-pack', pack] as const,
  augments: (label: string) => ['augments', 'for-slot', label] as const,
}

export function useItemRows(enabled = true): UseQueryResult<ItemRow[]> {
  return useQuery({ queryKey: itemKeys.rows, queryFn: fetchItemRows, enabled, ...FOREVER })
}

export function useItemDetail(id: number | null): UseQueryResult<ItemDetail> {
  return useQuery({
    queryKey: itemKeys.detail(id ?? -1),
    queryFn: () => fetchItemDetail(id as number),
    enabled: id !== null,
    retry: false,
    ...FOREVER,
  })
}

export function useAdventurePacks(): UseQueryResult<string[]> {
  return useQuery({ queryKey: itemKeys.packs, queryFn: fetchAdventurePacks, ...FOREVER })
}

export function useStatOptions(): UseQueryResult<string[]> {
  return useQuery({ queryKey: itemKeys.stats, queryFn: fetchStatOptions, ...FOREVER })
}

export function useItemIdsByStats(stats: readonly string[]): Set<number> | null {
  const results = useQueries({
    queries: stats.map((stat) => ({
      queryKey: itemKeys.byStat(stat),
      queryFn: () => fetchItemIdsByStat(stat),
      ...FOREVER,
    })),
  })
  if (stats.length === 0) return null
  if (results.some((r) => r.data === undefined)) return null
  const union = new Set<number>()
  for (const r of results) for (const id of r.data as Set<number>) union.add(id)
  return union
}

export function useItemIdsByPack(pack: string): Set<number> | null {
  const { data } = useQuery({
    queryKey: itemKeys.byPack(pack),
    queryFn: () => fetchItemIdsByPack(pack),
    enabled: pack !== '',
    ...FOREVER,
  })
  return pack === '' ? null : (data ?? null)
}

export function useSlotCandidates(slots: readonly ItemAugmentSlot[]): Record<string, AugmentCandidate[]> {
  const labels = [...new Set(slots.filter((s) => slotTakesCandidateList(s.family, s.label)).map((s) => s.label))]
  const results = useQueries({
    queries: labels.map((label) => ({
      queryKey: itemKeys.augments(label),
      queryFn: () => fetchAugmentsForSlot(label),
      ...FOREVER,
    })),
  })
  const out: Record<string, AugmentCandidate[]> = {}
  labels.forEach((label, i) => {
    const data = results[i]?.data
    if (data) out[label] = data
  })
  return out
}
