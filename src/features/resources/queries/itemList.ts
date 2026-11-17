import type {
  MatchableItemFilterParameter,
  SingleValueItemFilterParameter,
} from '../../../lib/api/itemListParameters'
import {
  statBonusFilterValue,
  fetchApiPage,
  matchableFilterParameters,
  singleValueFilterParameters,
  type ApiQueryParameters,
  type ApiItemRow,
  type ApiWeaponAbility,
  type ApiItemMaterial,
  type ApiAugmentSlotType,
  type ApiCraftingSystemRow,
} from '../../../lib/api'
import { filterOptionSource, type DeclaredFilter } from '../filters/filterOptionSources'
import { effectKindLabel } from './effectKindLabel'
import * as vocabularies from './itemFilterVocabularies'
import {
  type fetchEffectVocabulary,
  type RaidQuest,
  toItemSummary,
  type ItemSummary,
} from './items'

export const ITEM_PAGE_SIZE = 200
const ITEM_SORT_FIELD_BY_COLUMN = {
  name: 'name',
  ml: 'minimum_level',
  slot: 'slot',
  pack: 'pack',
  raid: 'is_raid',
  rare: 'is_rare',
} as const satisfies Record<string, string>

export type ItemColumnKey = keyof typeof ITEM_SORT_FIELD_BY_COLUMN

export const ITEM_COLUMN_KEYS = Object.keys(ITEM_SORT_FIELD_BY_COLUMN) as ItemColumnKey[]

export function isItemSortColumn(columnKey: string): columnKey is ItemColumnKey {
  return Object.hasOwn(ITEM_SORT_FIELD_BY_COLUMN, columnKey)
}

export interface ItemListFilters {
  ml: { min: string; max: string }
  slot: string[]
  bonuses: string[]
  bonusMatch: 'any' | 'all'
  set: string[]
  setMatch: 'any' | 'all'
  pack: string[]
  packMatch: 'any' | 'all'
  raid: string[]
  raidMatch: 'any' | 'all'
  attackAbility: string[]
  attackAbilityMatch: 'any' | 'all'
  damageAbility: string[]
  damageAbilityMatch: 'any' | 'all'
  material: string[]
  socket: string[]
  socketMatch: 'any' | 'all'
  craftingSystem: string[]
  craftingSystemMatch: 'any' | 'all'
  isRareOnly: boolean
  isRaidOnly: boolean
}

export interface ItemListSort {
  key: string
  direction: 'asc' | 'desc'
}

export const EMPTY_ITEM_FILTERS: ItemListFilters = {
  ml: { min: '', max: '' },
  slot: [],
  bonuses: [],
  bonusMatch: 'any',
  set: [],
  setMatch: 'any',
  pack: [],
  packMatch: 'any',
  raid: [],
  raidMatch: 'any',
  attackAbility: [],
  attackAbilityMatch: 'any',
  damageAbility: [],
  damageAbilityMatch: 'any',
  material: [],
  socket: [],
  socketMatch: 'any',
  craftingSystem: [],
  craftingSystemMatch: 'any',
  isRareOnly: false,
  isRaidOnly: false,
}

export interface ItemPage {
  total: number
  items: ItemSummary[]
}

export interface ItemListScope {
  canListWeapons: boolean
}

type MultiValueItemFilterKey = {
  [Key in keyof ItemListFilters]: ItemListFilters[Key] extends string[] ? Key : never
}[keyof ItemListFilters]

type ItemFilterChip = Omit<
  Extract<DeclaredFilter<ItemListFilters>, { kind: 'multi' }>,
  'key' | 'kind' | 'matchKey' | 'parameter'
>
type ItemMatchKey = NonNullable<
  Extract<DeclaredFilter<ItemListFilters>, { kind: 'multi' }>['matchKey']
>
type ItemFilterDeclaration = ItemFilterChip & { isWeaponOnly: boolean } & (
    | { parameter: MatchableItemFilterParameter; matchKey: ItemMatchKey }
    | { parameter: SingleValueItemFilterParameter; matchKey: null }
  )

function createMatchableItemFilterDeclaration(
  parameter: MatchableItemFilterParameter,
  matchKey: ItemMatchKey,
  chip: ItemFilterChip & { isWeaponOnly?: boolean },
): ItemFilterDeclaration {
  return { isWeaponOnly: false, ...chip, parameter, matchKey }
}

function createSingleValueItemFilterDeclaration(
  parameter: SingleValueItemFilterParameter,
  chip: ItemFilterChip,
): ItemFilterDeclaration {
  return { isWeaponOnly: false, ...chip, parameter, matchKey: null }
}

export const ITEM_LIST_FILTERS = {
  slot: createSingleValueItemFilterDeclaration('slot', {
    label: 'Gear slot',
    group: 'item',
    searchPlaceholder: 'Find a slot…',

    optionSource: filterOptionSource<ItemListFilters, string[]>({
      path: '/v1/equipment-slots',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.equipmentSlotNamesQueryOptions,

      toOptionSet: ({ shown }) => {
        return { options: (shown ?? []).map((name) => ({ value: name, label: name })) }
      },
    }),
  }),
  bonuses: createMatchableItemFilterDeclaration('bonus', 'bonusMatch', {
    label: 'Bonuses',
    group: 'item',
    searchPlaceholder: 'Stat, group or enchantment…',
    hoverKind: 'bonus',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<
      ItemListFilters,
      Awaited<ReturnType<typeof fetchEffectVocabulary>>
    >({
      path: '/v1/effects',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.effectVocabularyQueryOptions,
      isServerSearched: true,
      toOptionSet: ({ shown, unsearched, values }) => {
        return {
          optionCount: unsearched?.total ?? shown?.rows.length ?? 0,
          selectedOptionLabels: new Map(
            (unsearched?.rows ?? []).flatMap((row): Array<[string, string]> => [
              [row.name, row.name],
              ...row.bonus_types.map((bonusType): [string, string] => [
                statBonusFilterValue(row.name, bonusType.name),
                `${row.name} · ${bonusType.name}`,
              ]),
            ]),
          ),
          options: (shown?.rows ?? []).map((row) => {
            const selectedTypes = row.bonus_types.filter((bonusType) =>
              values.bonuses.includes(statBonusFilterValue(row.name, bonusType.name)),
            )
            const typeLabel =
              selectedTypes.length === 0
                ? 'Any type'
                : selectedTypes.length === 1
                  ? selectedTypes[0].name
                  : `${selectedTypes.length} types`
            return {
              key: row.slug,
              detailSlug: row.slug,
              value: row.name,
              label: row.name,
              caption: [
                row.kind === 'stat' ? `Stat · ${typeLabel}` : effectKindLabel(row.kind),
                ...(row.matchedAlias !== null ? [`also: ${row.matchedAlias}`] : []),
              ].join(' · '),
              children:
                row.kind === 'stat'
                  ? row.bonus_types.map((bonusType) => ({
                      value: statBonusFilterValue(row.name, bonusType.name),
                      label: `${row.name} · ${bonusType.name}`,
                      caption: `${bonusType.item_count}`,
                      detailSlug: row.slug,
                    }))
                  : undefined,
            }
          }),
        }
      },
    }),
  }),
  set: createMatchableItemFilterDeclaration('set', 'setMatch', {
    label: 'Set',
    group: 'item',
    searchPlaceholder: 'Find a set…',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<ItemListFilters, { rows: string[]; total: number }>({
      path: '/v1/sets',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.setVocabularyQueryOptions,
      isServerSearched: true,
      toOptionSet: ({ shown, unsearched }) => {
        return {
          options: (shown?.rows ?? []).map((name) => ({ value: name, label: name })),
          optionCount: unsearched?.total ?? shown?.rows.length ?? 0,
        }
      },
    }),
  }),
  attackAbility: createMatchableItemFilterDeclaration('attack_ability', 'attackAbilityMatch', {
    label: 'Attack ability',
    group: 'item',
    searchPlaceholder: 'Find attack ability…',
    isWeaponOnly: true,
    hoverKind: 'bonus',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<ItemListFilters, ApiWeaponAbility[]>({
      path: '/v1/weapon-abilities',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.weaponAbilitiesQueryOptions,

      toOptionSet: ({ shown }) => {
        return {
          options: (shown ?? []).map((row) => ({
            value: row.name,
            label: row.name,
            caption: String(row.attack_item_count),
            detailSlug: row.slug,
          })),
        }
      },
    }),
  }),
  damageAbility: createMatchableItemFilterDeclaration('damage_ability', 'damageAbilityMatch', {
    label: 'Damage ability',
    group: 'item',
    searchPlaceholder: 'Find damage ability…',
    isWeaponOnly: true,
    hoverKind: 'bonus',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<ItemListFilters, ApiWeaponAbility[]>({
      path: '/v1/weapon-abilities',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.weaponAbilitiesQueryOptions,

      toOptionSet: ({ shown }) => {
        return {
          options: (shown ?? []).map((row) => ({
            value: row.name,
            label: row.name,
            caption: String(row.damage_item_count),
            detailSlug: row.slug,
          })),
        }
      },
    }),
  }),
  material: createSingleValueItemFilterDeclaration('material', {
    label: 'Material',
    group: 'item',
    searchPlaceholder: 'Find material…',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<ItemListFilters, ApiItemMaterial[]>({
      path: '/v1/item-materials',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.itemMaterialsQueryOptions,

      toOptionSet: ({ shown }) => {
        return {
          options: (shown ?? []).map((row) => ({
            value: row.name,
            label: row.name,
            caption: String(row.item_count),
          })),
        }
      },
    }),
  }),
  socket: createMatchableItemFilterDeclaration('socket', 'socketMatch', {
    label: 'Socket',
    group: 'item',
    searchPlaceholder: 'Find socket…',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<ItemListFilters, ApiAugmentSlotType[]>({
      path: '/v1/augment-slot-types',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.socketTypesQueryOptions,

      toOptionSet: ({ shown }) => {
        return {
          options: (shown ?? []).map((row) => ({
            value: row.label,
            label: row.label,
            caption: [row.family, row.item_count].join(' · '),
          })),
        }
      },
    }),
  }),
  pack: createMatchableItemFilterDeclaration('pack', 'packMatch', {
    label: 'Pack',
    group: 'source',
    searchPlaceholder: 'Find a pack…',

    optionSource: filterOptionSource<ItemListFilters, string[]>({
      path: '/v1/adventure-packs',
      restoredLabelSource: 'value',
      queryOptions: vocabularies.adventurePackNamesQueryOptions,

      toOptionSet: ({ shown }) => {
        return { options: (shown ?? []).map((name) => ({ value: name, label: name })) }
      },
    }),
  }),
  raid: createMatchableItemFilterDeclaration('quest', 'raidMatch', {
    label: 'Raid',
    group: 'source',
    searchPlaceholder: 'Find a raid…',

    optionSource: filterOptionSource<ItemListFilters, RaidQuest[]>({
      path: '/v1/quests',
      restoredLabelSource: 'vocabulary',
      queryOptions: vocabularies.raidQuestsQueryOptions,

      toOptionSet: ({ shown }) => {
        return {
          options: (shown ?? []).map((row) => ({
            value: row.slug,
            label: row.name,
            caption: row.pack ?? undefined,
          })),
        }
      },
    }),
  }),
  craftingSystem: createMatchableItemFilterDeclaration('crafting_system', 'craftingSystemMatch', {
    label: 'Crafting system',
    group: 'source',
    searchPlaceholder: 'Find crafting system…',
    shouldPreserveOptionOrder: true,
    optionSource: filterOptionSource<ItemListFilters, ApiCraftingSystemRow[]>({
      path: '/v1/crafting-systems',
      restoredLabelSource: 'vocabulary',
      queryOptions: vocabularies.craftingSystemVocabularyQueryOptions,

      toOptionSet: ({ shown }) => {
        return {
          options: (shown ?? []).map((row) => ({
            value: row.slug,
            label: row.name,
            caption: String(row.item_count),
          })),
        }
      },
    }),
  }),
} satisfies Record<MultiValueItemFilterKey, ItemFilterDeclaration>

export function declaredItemFilters(scope: ItemListScope): DeclaredFilter<ItemListFilters>[] {
  return [
    {
      key: 'ml',
      label: 'ML range',
      shortLabel: 'ML',
      accessibleName: 'Minimum level',
      kind: 'range',
      group: 'item',
      range: {
        minLabel: 'Min ML',
        maxLabel: 'Max ML',
        minimum: 1,
        maximum: 36,
        minPlaceholder: '1',
        maxPlaceholder: '36',
        hint: 'Either bound can be blank. Applies on Enter or when you leave the field.',
      },
    },
    ...Object.entries(ITEM_LIST_FILTERS).flatMap(
      ([key, entry]): DeclaredFilter<ItemListFilters>[] => {
        if (entry.isWeaponOnly && !scope.canListWeapons) return []
        return [
          {
            ...entry,
            key: key as MultiValueItemFilterKey,
            kind: 'multi',
            matchKey: entry.matchKey ?? undefined,
          },
        ]
      },
    ),
    {
      key: 'isRareOnly',
      label: 'Rare only',
      kind: 'toggle',
      group: 'loot',
      appliedGroupLabel: 'Show',
    },
    {
      key: 'isRaidOnly',
      label: 'Raid only',
      kind: 'toggle',
      group: 'loot',
      appliedGroupLabel: 'Show',
    },
  ]
}

export function itemListParameters(
  filters: ItemListFilters,
  searchQuery: string,
  includesSetBonuses: boolean,
  offset = 0,
  sort: ItemListSort | null = null,
  scope: ItemListScope = { canListWeapons: true },
): ApiQueryParameters {
  const sortField =
    sort && isItemSortColumn(sort.key) ? ITEM_SORT_FIELD_BY_COLUMN[sort.key] : undefined
  const parameters: ApiQueryParameters = {}
  for (const [key, entry] of Object.entries(ITEM_LIST_FILTERS)) {
    if (entry.isWeaponOnly && !scope.canListWeapons) continue
    const values = filters[key as MultiValueItemFilterKey]
    Object.assign(
      parameters,
      entry.matchKey === null
        ? singleValueFilterParameters(entry.parameter, values)
        : matchableFilterParameters(entry.parameter, values, filters[entry.matchKey]),
    )
  }
  return {
    ...parameters,
    q: searchQuery.trim() || undefined,
    min_level: filters.ml.min || undefined,
    max_level: filters.ml.max || undefined,
    include_set_bonuses: filters.bonuses.length > 0 && includesSetBonuses,
    rare: filters.isRareOnly,
    raid: filters.isRaidOnly,
    sort: sortField
      ? [
          `${sort?.direction === 'desc' ? '-' : ''}${sortField}`,
          ...(sortField === 'name' ? [] : ['name']),
        ]
      : undefined,
    limit: ITEM_PAGE_SIZE,
    offset,
  }
}

export async function fetchItemPage(
  filters: ItemListFilters,
  searchQuery: string,
  includesSetBonuses: boolean,
  offset = 0,
  sort: ItemListSort | null = null,
  scope: ItemListScope = { canListWeapons: true },
): Promise<ItemPage> {
  const page = await fetchApiPage<ApiItemRow, 'items'>(
    '/v1/items',
    'items',
    itemListParameters(filters, searchQuery, includesSetBonuses, offset, sort, scope),
  )
  return { total: page.total, items: page.rows.map((row, index) => toItemSummary(row, index)) }
}
