import { fetchApiJson, fetchApiPage, WHOLE_LIST_PAGE_LIMIT } from '../../../lib/api'
import type {
  ApiAdventurePack,
  ApiAugment,
  ApiAugmentDetail,
  ApiCraftingRecipe,
  ApiCraftingTier,
  ApiItemAdventurePack,
  ApiItemChallengePack,
  ApiItemCraftingSystem,
  ApiItemDetail,
  ApiItemEvent,
  ApiItemVendor,
  ApiItemRow,
  ApiEnchantment,
  ApiEquipmentSlot,
  ApiLootQuest,
  ApiQueryParameters,
  ApiQuestSummary,
} from '../../../lib/api'

export const ITEM_PAGE_SIZE = 200
const ITEM_SORT_FIELD_BY_COLUMN: Record<string, string> = {
  name: 'name',
  ml: 'minimum_level',
  slot: 'slot',
  pack: 'pack',
}

export interface ItemSummary {
  id: number
  name: string
  equipmentSlot: string
  category: string
  minimumLevel: number | null
  pack: string | null
  isRaidLoot: boolean
  isRareLoot: boolean
  isLegacy: boolean
}

export interface ItemListFilters {
  ml: { min: string; max: string }
  slot: string
  enchantments: string[]
  pack: string
  raid: string
  isRareOnly: boolean
  isRaidOnly: boolean
}

export interface ItemListSort {
  key: string
  direction: 'asc' | 'desc'
}

export const EMPTY_ITEM_FILTERS: ItemListFilters = {
  ml: { min: '', max: '' },
  slot: '',
  enchantments: [],
  pack: '',
  raid: '',
  isRareOnly: false,
  isRaidOnly: false,
}

export interface ItemPage {
  total: number
  items: ItemSummary[]
}

export interface ItemAttributes {
  id: number
  name: string
  equipmentSlot: string
  category: string
  type: string | null
  minimumLevel: number | null
  enhancementBonus: number | null
  material: string | null
  requiredRace: string | null
  description: string | null
  dropLocation: string | null
  setName: string | null
  setId: number | null
  canAcceptSentience: boolean
  isMinorArtifact: boolean
  wikiUrl: string | null
  isLegacy: boolean
}

export interface ItemWeaponStats {
  damage: string | null
  critical: string | null
  weaponType: string
  proficiency: string | null
  handedness: string | null
  damageReductionBypasses: string[]
}

export interface ItemArmorStats {
  armorType: string
  armorBonus: number | null
  maximumDexterityBonus: number | null
  arcaneSpellFailurePercent: number | null
  armorCheckPenalty: number | null
  shieldBonus: number | null
  damageReduction: number | null
}

export interface ItemAugmentSlotOption {
  name: string
  description: string | null
  minimumLevel: number | null
}

export interface ItemAugmentSlot {
  sortOrder: number
  label: string
  family: string
  qualifier: string | null
  options: ItemAugmentSlotOption[]
}

export interface CraftingIngredientCost {
  ingredient: string
  quantity: number
}

export interface CraftingRecipe {
  system: string
  tier: ApiCraftingTier
  ingredientCosts: CraftingIngredientCost[]
}

export interface AugmentSummary {
  id: number
  name: string
  minimumLevel: number | null
  bonusNames: string[]
  recipes: CraftingRecipe[]
}

export interface ItemBonus {
  id: number
  name: string
  description: string | null
  bonusType: string | null
  statName: string
  value: number | null
  sortOrder: number
}

export interface ItemEffect {
  id: number
  name: string
  description: string | null
  target: string | null
  value: number | null
  sortOrder: number
}

export interface ItemClickie {
  name: string
  description: string | null
}

export interface LootQuest {
  id: number
  name: string
  level: number | null
  pack: string | null
  patron: string | null
  isEndReward: boolean
  isRaid: boolean
  isRareLoot: boolean
  isFreeToPlay: boolean
  chests: string[]
}

export interface RewardingQuestChain {
  id: number
  name: string
  isRareLoot: boolean
  wikiUrl: string | null
}

export interface RewardingSaga {
  id: number
  name: string
  tier: string | null
  isRareLoot: boolean
  wikiUrl: string | null
}

export type ItemSourceKind =
  'adventurePack' | 'craftingSystem' | 'challengePack' | 'vendor' | 'event' | 'starter'

export interface ItemSource {
  kind: ItemSourceKind
  key: string
  name: string
  vendorLocation: string | null
  cost: string | null
  chest: string | null
  characterLevel: number | null
  isRareLoot: boolean
  wikiUrl: string | null
}

export interface RaidQuest {
  id: number
  name: string
  pack: string | null
}

export interface Item extends ItemAttributes {
  weaponStats: ItemWeaponStats | null
  armorStats: ItemArmorStats | null
  augmentSlots: ItemAugmentSlot[]
  bonuses: ItemBonus[]
  effects: ItemEffect[]
  clickies: ItemClickie[]
  quests: LootQuest[]
  questChains: RewardingQuestChain[]
  sagas: RewardingSaga[]
  adventurePackDrops: ItemSource[]
  sourcesBeyondQuests: ItemSource[]
}

export function toItemSummary(apiItemRow: ApiItemRow): ItemSummary {
  return {
    id: apiItemRow.id,
    name: apiItemRow.name,
    equipmentSlot: apiItemRow.slot,
    category: apiItemRow.category,
    minimumLevel: apiItemRow.minimum_level,
    pack: apiItemRow.pack,
    isRaidLoot: apiItemRow.is_raid,
    isRareLoot: apiItemRow.is_rare,
    isLegacy: apiItemRow.is_legacy,
  }
}

export function toItem(apiItemDetail: ApiItemDetail): Item {
  return {
    id: apiItemDetail.id,
    name: apiItemDetail.name,
    equipmentSlot: apiItemDetail.slot,
    category: apiItemDetail.category,
    type: apiItemDetail.item_type,
    minimumLevel: apiItemDetail.minimum_level,
    enhancementBonus: apiItemDetail.enhancement_bonus,
    material: apiItemDetail.material,
    requiredRace: apiItemDetail.race_required,
    description: apiItemDetail.description,
    dropLocation: apiItemDetail.drop_location,
    setName: apiItemDetail.set?.name ?? apiItemDetail.set_name,
    setId: apiItemDetail.set?.id ?? null,
    canAcceptSentience: apiItemDetail.accepts_sentience,
    isMinorArtifact: apiItemDetail.is_minor_artifact,
    wikiUrl: apiItemDetail.wiki_url,
    isLegacy: apiItemDetail.is_legacy,
    weaponStats: apiItemDetail.weapon
      ? {
          damage: apiItemDetail.weapon.damage,
          critical: apiItemDetail.weapon.critical,
          weaponType: apiItemDetail.weapon.weapon_type,
          proficiency: apiItemDetail.weapon.proficiency,
          handedness: apiItemDetail.weapon.handedness,
          damageReductionBypasses: apiItemDetail.weapon.dr_bypass,
        }
      : null,
    armorStats: apiItemDetail.armor
      ? {
          armorType: apiItemDetail.armor.armor_type,
          armorBonus: apiItemDetail.armor.armor_bonus,
          maximumDexterityBonus: apiItemDetail.armor.max_dex_bonus,
          arcaneSpellFailurePercent: apiItemDetail.armor.arcane_spell_failure,
          armorCheckPenalty: apiItemDetail.armor.armor_check_penalty,
          shieldBonus: apiItemDetail.armor.shield_bonus,
          damageReduction: apiItemDetail.armor.damage_reduction,
        }
      : null,
    augmentSlots: apiItemDetail.augment_slots.map((s) => ({
      sortOrder: s.sort_order,
      label: s.label,
      family: s.family,
      qualifier: s.qualifier,
      options: s.options.map((o) => ({
        name: o.name,
        description: o.description,
        minimumLevel: o.min_level,
      })),
    })),
    bonuses: apiItemDetail.bonuses.map((b, i) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      bonusType: b.bonus_type,
      statName: b.stat,
      value: b.value,
      sortOrder: i,
    })),
    effects: apiItemDetail.effects.map((e, i) => ({
      id: e.id,
      name: e.name,
      description: e.description,
      target: e.target,
      value: e.value,
      sortOrder: i,
    })),
    clickies: apiItemDetail.clickies.map((c) => ({ name: c.name, description: c.description })),
    quests: toLootQuests(apiItemDetail.quests),
    questChains: apiItemDetail.quest_chains.map((c) => ({
      id: c.id,
      name: c.name,
      isRareLoot: c.is_rare,
      wikiUrl: c.wiki_url,
    })),
    sagas: apiItemDetail.sagas.map((s) => ({
      id: s.id,
      name: s.name,
      tier: s.tier,
      isRareLoot: s.is_rare,
      wikiUrl: s.wiki_url,
    })),
    adventurePackDrops: apiItemDetail.adventure_packs.map((p) => ({
      ...namedSource('adventurePack', p),
      chest: p.chest,
    })),
    sourcesBeyondQuests: toSourcesBeyondQuests(apiItemDetail),
  }
}

function namedSource(
  kind: ItemSourceKind,
  apiSource:
    | ApiItemAdventurePack
    | ApiItemCraftingSystem
    | ApiItemChallengePack
    | ApiItemVendor
    | ApiItemEvent,
): ItemSource {
  return {
    kind,
    key: `${kind}-${apiSource.id}`,
    name: apiSource.name,
    vendorLocation: null,
    cost: null,
    chest: null,
    characterLevel: null,
    isRareLoot: apiSource.is_rare,
    wikiUrl: apiSource.wiki_url ?? null,
  }
}

function toSourcesBeyondQuests(apiItemDetail: ApiItemDetail): ItemSource[] {
  return [
    ...apiItemDetail.crafting_systems.map((c) => namedSource('craftingSystem', c)),
    ...apiItemDetail.challenge_packs.map((c) => namedSource('challengePack', c)),
    ...apiItemDetail.vendors.map((v) => ({
      ...namedSource('vendor', v),
      vendorLocation: v.location,
      cost: v.cost,
    })),
    ...apiItemDetail.events.map((e) => namedSource('event', e)),
    ...apiItemDetail.starter_rewards.map((s) => ({
      kind: 'starter' as const,
      key: `starter-${s.character_level}`,
      name: `Starter gear at level ${s.character_level}`,
      vendorLocation: null,
      cost: null,
      chest: null,
      characterLevel: s.character_level,
      isRareLoot: false,
      wikiUrl: null,
    })),
  ]
}

function toLootQuests(apiLootQuests: ApiLootQuest[]): LootQuest[] {
  const lootQuestsById = new Map<number, LootQuest>()
  for (const apiLootQuest of apiLootQuests) {
    const lootQuest = lootQuestsById.get(apiLootQuest.id) ?? {
      id: apiLootQuest.id,
      name: apiLootQuest.name,
      level: apiLootQuest.level,
      pack: apiLootQuest.pack,
      patron: apiLootQuest.patron,
      isEndReward: false,
      isRaid: false,
      isRareLoot: false,
      isFreeToPlay: apiLootQuest.is_free_to_play,
      chests: [],
    }
    lootQuest.isEndReward ||= apiLootQuest.loot_type === 'reward'
    lootQuest.isRaid ||= apiLootQuest.is_raid
    lootQuest.isRareLoot ||= apiLootQuest.is_rare
    if (apiLootQuest.chest && !lootQuest.chests.includes(apiLootQuest.chest))
      lootQuest.chests.push(apiLootQuest.chest)
    lootQuestsById.set(apiLootQuest.id, lootQuest)
  }
  return [...lootQuestsById.values()]
}

export function toAugmentSummary(apiAugment: ApiAugment): AugmentSummary {
  return {
    id: apiAugment.id,
    name: apiAugment.name,
    minimumLevel: apiAugment.min_level,
    bonusNames: apiAugment.bonuses.map((b) => b.name),
    recipes: apiAugment.crafting.map(toCraftingRecipe),
  }
}

function toCraftingRecipe(apiRecipe: ApiCraftingRecipe): CraftingRecipe {
  return {
    system: apiRecipe.system,
    tier: apiRecipe.tier,
    ingredientCosts: apiRecipe.cost.map((c) => ({
      ingredient: c.ingredient,
      quantity: c.quantity,
    })),
  }
}

export function isCraftingSlotFamily(family: string): boolean {
  return family !== 'standard'
}

export function canListFittingAugments(slotFamily: string, slotLabel: string): boolean {
  return isCraftingSlotFamily(slotFamily) || slotLabel === 'sun' || slotLabel === 'moon'
}

export function itemListParameters(
  filters: ItemListFilters,
  searchQuery: string,
  includesSetBonuses: boolean,
  offset = 0,
  sort: ItemListSort | null = null,
): ApiQueryParameters {
  const sortField = sort ? ITEM_SORT_FIELD_BY_COLUMN[sort.key] : undefined
  return {
    q: searchQuery.trim() || undefined,
    slot: filters.slot || undefined,
    min_level: filters.ml.min || undefined,
    max_level: filters.ml.max || undefined,
    pack: filters.pack || undefined,
    quest: filters.raid || undefined,
    enchantment: filters.enchantments.length ? filters.enchantments : undefined,
    include_set_bonuses: filters.enchantments.length > 0 && includesSetBonuses,
    rare: filters.isRareOnly,
    raid: filters.isRaidOnly,
    sort: sortField ? `${sort?.direction === 'desc' ? '-' : ''}${sortField}` : undefined,
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
): Promise<ItemPage> {
  const page = await fetchApiPage<ApiItemRow, 'items'>(
    '/v1/items',
    'items',
    itemListParameters(filters, searchQuery, includesSetBonuses, offset, sort),
  )
  return { total: page.total, items: page.rows.map(toItemSummary) }
}

export async function fetchItem(id: number): Promise<Item> {
  return toItem(await fetchApiJson<ApiItemDetail>(`/v1/items/${id}`))
}

export async function fetchAdventurePackNames(): Promise<string[]> {
  const page = await fetchApiPage<ApiAdventurePack, 'adventure_packs'>(
    '/v1/adventure-packs',
    'adventure_packs',
    { limit: WHOLE_LIST_PAGE_LIMIT },
  )
  return page.rows.map((pack) => pack.name)
}

export async function fetchEquipmentSlotNames(): Promise<string[]> {
  const page = await fetchApiPage<ApiEquipmentSlot, 'equipment_slots'>(
    '/v1/equipment-slots',
    'equipment_slots',
    { limit: WHOLE_LIST_PAGE_LIMIT },
  )
  return page.rows.map((slot) => slot.name)
}

export async function fetchEnchantmentNames(): Promise<string[]> {
  const page = await fetchApiPage<ApiEnchantment, 'enchantments'>(
    '/v1/enchantments',
    'enchantments',
    { limit: WHOLE_LIST_PAGE_LIMIT },
  )
  return [...new Set(page.rows.map(({ name }) => name))]
}

export async function fetchAugmentsFittingSlot(slotLabel: string): Promise<AugmentSummary[]> {
  const page = await fetchApiPage<ApiAugment, 'augments'>('/v1/augments', 'augments', {
    slot: slotLabel,
    limit: WHOLE_LIST_PAGE_LIMIT,
  })
  return page.rows.map(toAugmentSummary).sort((a, b) => {
    if (a.minimumLevel === null && b.minimumLevel !== null) return 1
    if (b.minimumLevel === null && a.minimumLevel !== null) return -1
    if (a.minimumLevel !== b.minimumLevel) return (a.minimumLevel ?? 0) - (b.minimumLevel ?? 0)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

export async function fetchAugmentLootQuests(augmentId: number): Promise<LootQuest[]> {
  const augment = await fetchApiJson<ApiAugmentDetail>(`/v1/augments/${augmentId}`)
  return toLootQuests(augment.quests)
}

export async function fetchRaidQuests(): Promise<RaidQuest[]> {
  const page = await fetchApiPage<ApiQuestSummary, 'quests'>('/v1/quests', 'quests', {
    limit: WHOLE_LIST_PAGE_LIMIT,
  })
  return page.rows
    .filter((quest) => quest.is_raid)
    .map((quest) => ({ id: quest.id, name: quest.name, pack: quest.pack }))
}
