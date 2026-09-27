import { apiGet } from '../../../lib/api'
import type {
  ApiAdventurePack,
  ApiAugment,
  ApiAugmentsPage,
  ApiItemDetail,
  ApiItemRow,
  ApiItemsPage,
  ApiStat,
} from '../../../lib/api'


const PAGE_LIMIT = 10_000

export interface ItemRow {
  id: number
  name: string
  equipment_slot: string
  item_category: string
  minimum_level: number | null
  pack: string | null
  is_raid: boolean
}

export interface ItemCore {
  id: number
  name: string
  equipment_slot: string
  item_category: string
  item_type: string | null
  minimum_level: number | null
  enhancement_bonus: number | null
  material: string | null
  race_required: string | null
  description: string | null
  drop_location: string | null
  set_name: string | null
  accepts_sentience: boolean
  is_minor_artifact: boolean
  wiki_url: string | null
}

export interface ItemWeaponStats {
  damage: string | null
  critical: string | null
  weapon_type: string
  proficiency: string | null
  handedness: string | null
  dr_bypass: string[]
}

export interface ItemArmorStats {
  armor_type: string
  armor_bonus: number | null
  max_dex_bonus: number | null
  arcane_spell_failure: number | null
  armor_check_penalty: number | null
  shield_bonus: number | null
  damage_reduction: number | null
}

export interface ItemAugmentSlotOption {
  name: string
  description: string | null
  min_level: number | null
}

export interface ItemAugmentSlot {
  sort_order: number
  label: string
  family: string
  qualifier: string | null
  options: ItemAugmentSlotOption[]
}

export interface AugmentCandidate {
  augment_id: number
  name: string
  min_level: number | null
  bonuses: string[]
}

export interface ItemBonus {
  bonus_id: number
  name: string
  description: string | null
  bonus_type: string | null
  stat_name: string
  value: number | null
  sort_order: number
}

export interface ItemEffect {
  effect_id: number
  name: string
  description: string | null
  target: string | null
  value: number | null
  sort_order: number
}

export interface ItemClickie {
  name: string
  description: string | null
}

export interface ItemQuestRef {
  quest_id: number
  name: string
  level: number | null
  pack: string | null
  patron: string | null
  loot_type: string | null
  is_raid: boolean
}

export interface ItemDetail extends ItemCore {
  weaponStats: ItemWeaponStats | null
  armorStats: ItemArmorStats | null
  augmentSlots: ItemAugmentSlot[]
  bonuses: ItemBonus[]
  effects: ItemEffect[]
  clickies: ItemClickie[]
  quests: ItemQuestRef[]
}

export function toItemRow(row: ApiItemRow): ItemRow {
  return {
    id: row.id,
    name: row.name,
    equipment_slot: row.slot,
    item_category: row.category,
    minimum_level: row.minimum_level,
    pack: row.pack,
    is_raid: row.is_raid,
  }
}

export function toItemDetail(d: ApiItemDetail): ItemDetail {
  return {
    id: d.id,
    name: d.name,
    equipment_slot: d.slot,
    item_category: d.category,
    item_type: d.item_type,
    minimum_level: d.minimum_level,
    enhancement_bonus: d.enhancement_bonus,
    material: d.material,
    race_required: d.race_required,
    description: d.description,
    drop_location: d.drop_location,
    set_name: d.set?.name ?? d.set_name,
    accepts_sentience: d.accepts_sentience,
    is_minor_artifact: d.is_minor_artifact,
    wiki_url: d.wiki_url,
    weaponStats: d.weapon
      ? {
          damage: d.weapon.damage,
          critical: d.weapon.critical,
          weapon_type: d.weapon.weapon_type,
          proficiency: d.weapon.proficiency,
          handedness: d.weapon.handedness,
          dr_bypass: d.weapon.dr_bypass,
        }
      : null,
    armorStats: d.armor
      ? {
          armor_type: d.armor.armor_type,
          armor_bonus: d.armor.armor_bonus,
          max_dex_bonus: d.armor.max_dex_bonus,
          arcane_spell_failure: d.armor.arcane_spell_failure,
          armor_check_penalty: d.armor.armor_check_penalty,
          shield_bonus: d.armor.shield_bonus,
          damage_reduction: d.armor.damage_reduction,
        }
      : null,
    augmentSlots: d.augment_slots.map((s) => ({
      sort_order: s.sort_order,
      label: s.label,
      family: s.family,
      qualifier: s.qualifier,
      options: s.options,
    })),
    bonuses: d.bonuses.map((b, i) => ({
      bonus_id: b.id,
      name: b.name,
      description: b.description,
      bonus_type: b.bonus_type,
      stat_name: b.stat,
      value: b.value,
      sort_order: i,
    })),
    effects: d.effects.map((e, i) => ({
      effect_id: e.id,
      name: e.name,
      description: e.description,
      target: e.target,
      value: e.value,
      sort_order: i,
    })),
    clickies: d.clickies.map((c) => ({ name: c.name, description: c.description })),
    quests: d.quests.map((q) => ({
      quest_id: q.id,
      name: q.name,
      level: q.level,
      pack: q.pack,
      patron: q.patron,
      loot_type: q.loot_type,
      is_raid: q.is_raid,
    })),
  }
}

export function toAugmentCandidate(a: ApiAugment): AugmentCandidate {
  return {
    augment_id: a.id,
    name: a.name,
    min_level: a.min_level,
    bonuses: a.bonuses.map((b) => b.name),
  }
}

export function isFamilySlot(family: string): boolean {
  return family !== 'standard'
}

export function slotTakesCandidateList(family: string, label: string): boolean {
  return isFamilySlot(family) || label === 'sun' || label === 'moon'
}

export async function fetchItemRows(): Promise<ItemRow[]> {
  const page = await apiGet<ApiItemsPage>('/v1/items', { limit: PAGE_LIMIT })
  return page.items.map(toItemRow).sort(compareRows)
}

function compareRows(a: ItemRow, b: ItemRow): number {
  if (a.minimum_level === null && b.minimum_level !== null) return 1
  if (b.minimum_level === null && a.minimum_level !== null) return -1
  if (a.minimum_level !== b.minimum_level) return (b.minimum_level ?? 0) - (a.minimum_level ?? 0)
  const slot = a.equipment_slot.localeCompare(b.equipment_slot)
  if (slot !== 0) return slot
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

export async function fetchItemDetail(id: number): Promise<ItemDetail> {
  return toItemDetail(await apiGet<ApiItemDetail>(`/v1/items/${id}`))
}

export async function fetchAdventurePacks(): Promise<string[]> {
  const packs = await apiGet<ApiAdventurePack[]>('/v1/adventure-packs')
  return packs.map((p) => p.name)
}

export async function fetchStatOptions(): Promise<string[]> {
  const stats = await apiGet<ApiStat[]>('/v1/stats')
  return stats.map((s) => s.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

export async function fetchItemIdsByStat(stat: string): Promise<Set<number>> {
  const page = await apiGet<ApiItemsPage>('/v1/items', { stat, limit: PAGE_LIMIT })
  return new Set(page.items.map((r) => r.id))
}

export async function fetchItemIdsByPack(pack: string): Promise<Set<number>> {
  const page = await apiGet<ApiItemsPage>('/v1/items', { pack, limit: PAGE_LIMIT })
  return new Set(page.items.map((r) => r.id))
}

export async function fetchAugmentsForSlot(label: string): Promise<AugmentCandidate[]> {
  const page = await apiGet<ApiAugmentsPage>('/v1/augments', { slot: label, limit: PAGE_LIMIT })
  return page.augments.map(toAugmentCandidate).sort((a, b) => {
    if (a.min_level === null && b.min_level !== null) return 1
    if (b.min_level === null && a.min_level !== null) return -1
    if (a.min_level !== b.min_level) return (a.min_level ?? 0) - (b.min_level ?? 0)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}
