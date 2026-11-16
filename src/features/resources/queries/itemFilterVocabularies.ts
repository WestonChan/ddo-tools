import { queryOptions } from '@tanstack/react-query'
import { NEVER_STALE_QUERY_OPTIONS } from './neverStaleQueryOptions'
import { fetchSetVocabulary } from './sets'
import {
  fetchEquipmentSlotNames,
  fetchAdventurePackNames,
  fetchRaidQuests,
  fetchEffectVocabulary,
  fetchWeaponAbilities,
  fetchItemMaterials,
  fetchSocketTypes,
  fetchCraftingSystemVocabulary,
} from './items'

type VocabularyQueryOptions<Result> = ReturnType<typeof queryOptions<Result>>

export function equipmentSlotNamesQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchEquipmentSlotNames>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchEquipmentSlotNames>>>({
    queryKey: ['items', 'slots'],
    queryFn: fetchEquipmentSlotNames,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function adventurePackNamesQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchAdventurePackNames>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchAdventurePackNames>>>({
    queryKey: ['items', 'packs'],
    queryFn: fetchAdventurePackNames,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function raidQuestsQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchRaidQuests>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchRaidQuests>>>({
    queryKey: ['quests', 'raids'],
    queryFn: fetchRaidQuests,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function effectVocabularyQueryOptions(
  searchQuery: string,
): VocabularyQueryOptions<Awaited<ReturnType<typeof fetchEffectVocabulary>>> {
  return queryOptions<Awaited<ReturnType<typeof fetchEffectVocabulary>>>({
    queryKey: ['effects', 'vocabulary', searchQuery],
    queryFn: () => fetchEffectVocabulary(searchQuery),
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function setVocabularyQueryOptions(
  searchQuery: string,
): VocabularyQueryOptions<Awaited<ReturnType<typeof fetchSetVocabulary>>> {
  return queryOptions<Awaited<ReturnType<typeof fetchSetVocabulary>>>({
    queryKey: ['sets', 'vocabulary', searchQuery],
    queryFn: () => fetchSetVocabulary(searchQuery),
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function weaponAbilitiesQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchWeaponAbilities>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchWeaponAbilities>>>({
    queryKey: ['items', 'weapon-abilities'],
    queryFn: fetchWeaponAbilities,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function itemMaterialsQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchItemMaterials>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchItemMaterials>>>({
    queryKey: ['items', 'materials'],
    queryFn: fetchItemMaterials,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function socketTypesQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchSocketTypes>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchSocketTypes>>>({
    queryKey: ['items', 'socket-types'],
    queryFn: fetchSocketTypes,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}

export function craftingSystemVocabularyQueryOptions(): VocabularyQueryOptions<
  Awaited<ReturnType<typeof fetchCraftingSystemVocabulary>>
> {
  return queryOptions<Awaited<ReturnType<typeof fetchCraftingSystemVocabulary>>>({
    queryKey: ['items', 'crafting-systems'],
    queryFn: fetchCraftingSystemVocabulary,
    ...NEVER_STALE_QUERY_OPTIONS,
  })
}
