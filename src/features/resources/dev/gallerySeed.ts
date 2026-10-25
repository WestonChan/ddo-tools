import type { QueryClient, QueryKey } from '@tanstack/react-query'
import type { ApiEffectDetail, Slug } from '../../../lib/api'
import type { Effect, Item, ItemSource } from '../queries/items'
import type { QuestDetail } from '../queries/quests'
import type { SourceDetail } from '../queries/sources'
import {
  augmentDetailQueryOptions,
  effectDetailQueryOptions,
  fittingAugmentsQueryKey,
  itemDetailQueryOptions,
  questDetailQueryOptions,
  setDetailQueryOptions,
  sourceDetailQueryOptions,
} from '../queries/useItems'
import {
  GALLERY_AUGMENTS,
  GALLERY_ITEMS,
  GALLERY_SETS,
  galleryAugmentSummary,
  gallerySourceDetail,
} from './galleryItems'

interface GalleryQueryEntry {
  queryKey: QueryKey
  data: unknown
}

const SOURCE_DETAIL_KIND_BY_ITEM_SOURCE_KIND: Partial<
  Record<ItemSource['kind'], SourceDetail['kind']>
> = {
  adventurePack: 'adventurePack',
  craftingSystem: 'craftingSystem',
  vendor: 'vendor',
  event: 'event',
}

function emptyEffectCarrierPage<Key extends 'items' | 'augments' | 'set_tiers'>(
  key: Key,
  total: number,
): { total: number; limit: number; offset: number } & Record<Key, never[]> {
  return { total, limit: 0, offset: 0, [key]: [] } as {
    total: number
    limit: number
    offset: number
  } & Record<Key, never[]>
}

function effectDetailFor(effect: Effect, carrierCount: number): ApiEffectDetail {
  return {
    slug: effect.slug,
    name: effect.name,
    kind: 'effect',
    category: effect.bonusType,
    verbose_name_template: effect.verboseName,
    description_template: effect.description,
    wiki_url: null,
    default_value: effect.value,
    default_value2: effect.value2,
    tier: effect.tier
      ? {
          group: effect.tier.group,
          rank: effect.tier.rank,
          steps: [1, 2, 3].map((rank) => ({ slug: effect.slug, name: effect.name, rank })),
        }
      : null,
    bonuses: [],
    damage: [],
    items: emptyEffectCarrierPage('items', carrierCount),
    augments: emptyEffectCarrierPage('augments', 0),
    set_tiers: emptyEffectCarrierPage('set_tiers', 0),
  }
}

function allGalleryEffects(): Effect[] {
  return [
    ...GALLERY_ITEMS.flatMap((item) => item.effects),
    ...GALLERY_SETS.flatMap((set) => set.tiers.flatMap((tier) => tier.effects)),
    ...GALLERY_AUGMENTS.flatMap((augment) => augment.effects),
  ]
}

function questDetailFor(quest: Item['quests'][number]): QuestDetail {
  return {
    slug: quest.slug,
    name: quest.name,
    pack: quest.pack,
    patron: quest.patron,
    level: quest.level,
    epicLevel: quest.epicLevel,
    isRaid: quest.isRaid,
    items: GALLERY_ITEMS.filter((item) =>
      item.quests.some((candidate) => candidate.slug === quest.slug),
    ).map((item) => ({
      slug: item.slug,
      name: item.name,
      slot: item.equipmentSlot,
      minimumLevel: item.minimumLevel,
    })),
  }
}

function sourceReferences(
  item: Item,
): Array<{ kind: SourceDetail['kind']; slug: Slug; name: string }> {
  return [
    ...[...item.adventurePackDrops, ...item.sourcesBeyondQuests].flatMap((source) => {
      const kind = SOURCE_DETAIL_KIND_BY_ITEM_SOURCE_KIND[source.kind]
      return kind && source.slug ? [{ kind, slug: source.slug, name: source.name }] : []
    }),
    ...item.questChains.map(({ slug, name }) => ({ kind: 'questChain' as const, slug, name })),
    ...item.sagas.map(({ slug, name }) => ({ kind: 'saga' as const, slug, name })),
  ]
}

function galleryQueryEntries(): GalleryQueryEntry[] {
  const effectCarrierCounts = new Map<Slug, number>()
  for (const item of GALLERY_ITEMS)
    for (const effect of item.effects)
      effectCarrierCounts.set(effect.slug, (effectCarrierCounts.get(effect.slug) ?? 0) + 1)
  const slotLabels = new Set(
    GALLERY_ITEMS.flatMap((item) => item.augmentSlots.map((slot) => slot.label)),
  )
  return [
    ...GALLERY_ITEMS.map((item) => ({
      queryKey: itemDetailQueryOptions(item.slug).queryKey,
      data: item,
    })),
    ...GALLERY_SETS.map((set) => ({
      queryKey: setDetailQueryOptions(set.slug).queryKey,
      data: set,
    })),
    ...allGalleryEffects().map((effect) => ({
      queryKey: effectDetailQueryOptions(effect.slug).queryKey,
      data: effectDetailFor(effect, effectCarrierCounts.get(effect.slug) ?? 0),
    })),
    ...GALLERY_ITEMS.flatMap((item) =>
      item.quests.map((quest) => ({
        queryKey: questDetailQueryOptions(quest.slug).queryKey,
        data: questDetailFor(quest),
      })),
    ),
    ...GALLERY_ITEMS.flatMap(sourceReferences).map(({ kind, slug, name }) => ({
      queryKey: sourceDetailQueryOptions(kind, slug).queryKey,
      data: gallerySourceDetail(kind, slug, name),
    })),
    ...[...slotLabels].map((label) => ({
      queryKey: fittingAugmentsQueryKey(label),
      data: GALLERY_AUGMENTS.filter((augment) => augment.slots.includes(label)).map(
        galleryAugmentSummary,
      ),
    })),
    ...GALLERY_AUGMENTS.map((augment) => ({
      queryKey: augmentDetailQueryOptions(augment.slug).queryKey,
      data: augment,
    })),
  ]
}

export function seedGalleryQueries(queryClient: QueryClient): QueryKey[] {
  const entries = galleryQueryEntries()
  for (const { queryKey, data } of entries) queryClient.setQueryData(queryKey, data)
  return entries.map(({ queryKey }) => queryKey)
}

export function removeGalleryQueries(
  queryClient: QueryClient,
  queryKeys: readonly QueryKey[],
): void {
  for (const queryKey of queryKeys) queryClient.removeQueries({ queryKey, exact: true })
}
