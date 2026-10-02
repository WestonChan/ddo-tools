import { fetchApiJson } from '../../../lib/api'
import type {
  ApiAdventurePack,
  ApiAugment,
  ApiAugmentDetail,
  ApiAugmentsPage,
  ApiCraftingRecipe,
  ApiCraftingTier,
  ApiItemAdventurePack,
  ApiItemChallengePack,
  ApiItemCraftingSystem,
  ApiItemDetail,
  ApiItemEvent,
  ApiItemVendor,
  ApiItemRow,
  ApiItemsPage,
  ApiLootQuest,
  ApiStat,
} from '../../../lib/api'

const WHOLE_LIST_LIMIT = 10_000

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
  | 'adventurePack'
  | 'craftingSystem'
  | 'challengePack'
  | 'vendor'
  | 'event'
  | 'starter'

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

export async function fetchItemSummaries(): Promise<ItemSummary[]> {
  const page = await fetchApiJson<ApiItemsPage>('/v1/items', { limit: WHOLE_LIST_LIMIT })
  return page.items.map(toItemSummary).sort(compareHighestLevelFirst)
}

function compareHighestLevelFirst(a: ItemSummary, b: ItemSummary): number {
  if (a.minimumLevel === null && b.minimumLevel !== null) return 1
  if (b.minimumLevel === null && a.minimumLevel !== null) return -1
  if (a.minimumLevel !== b.minimumLevel) return (b.minimumLevel ?? 0) - (a.minimumLevel ?? 0)
  const slotComparison = a.equipmentSlot.localeCompare(b.equipmentSlot)
  if (slotComparison !== 0) return slotComparison
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export async function fetchItem(id: number): Promise<Item> {
  return toItem(await fetchApiJson<ApiItemDetail>(`/v1/items/${id}`))
}

export async function fetchAdventurePackNames(): Promise<string[]> {
  const packs = await fetchApiJson<ApiAdventurePack[]>('/v1/adventure-packs')
  return packs.map((p) => p.name)
}

export async function fetchStatNames(): Promise<string[]> {
  const stats = await fetchApiJson<ApiStat[]>('/v1/stats')
  return stats
    .map((s) => s.name)
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export async function fetchItemIdsWithStat(statName: string): Promise<Set<number>> {
  const page = await fetchApiJson<ApiItemsPage>('/v1/items', {
    stat: statName,
    limit: WHOLE_LIST_LIMIT,
  })
  return new Set(page.items.map((r) => r.id))
}

export async function fetchItemIdsInPack(packName: string): Promise<Set<number>> {
  const page = await fetchApiJson<ApiItemsPage>('/v1/items', {
    pack: packName,
    limit: WHOLE_LIST_LIMIT,
  })
  return new Set(page.items.map((r) => r.id))
}

export async function fetchAugmentsFittingSlot(slotLabel: string): Promise<AugmentSummary[]> {
  const page = await fetchApiJson<ApiAugmentsPage>('/v1/augments', {
    slot: slotLabel,
    limit: WHOLE_LIST_LIMIT,
  })
  return page.augments.map(toAugmentSummary).sort((a, b) => {
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
