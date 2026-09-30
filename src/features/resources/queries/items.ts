import { fetchApiJson } from '../../../lib/api'
import type {
  ApiAdventurePack,
  ApiAugment,
  ApiAugmentsPage,
  ApiCraftingRecipe,
  ApiCraftingTier,
  ApiItemDetail,
  ApiItemRow,
  ApiItemsPage,
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

export interface ItemDropQuest {
  id: number
  name: string
  level: number | null
  pack: string | null
  patron: string | null
  lootType: string | null
  isRaid: boolean
  isRareLoot: boolean
  duration: string | null
  isFreeToPlay: boolean
}

export interface Item extends ItemAttributes {
  weaponStats: ItemWeaponStats | null
  armorStats: ItemArmorStats | null
  augmentSlots: ItemAugmentSlot[]
  bonuses: ItemBonus[]
  effects: ItemEffect[]
  clickies: ItemClickie[]
  quests: ItemDropQuest[]
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
    quests: apiItemDetail.quests.map((q) => ({
      id: q.id,
      name: q.name,
      level: q.level,
      pack: q.pack,
      patron: q.patron,
      lootType: q.loot_type,
      isRaid: q.is_raid,
      isRareLoot: q.is_rare,
      duration: q.duration,
      isFreeToPlay: q.is_free_to_play,
    })),
  }
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
