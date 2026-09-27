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

/**
 * The item surface of `ddo-api`, shaped for the resources views.
 *
 * Two halves: `fetch*` functions call the API (one endpoint each, no caching
 * here — the hooks in `useItems.ts` own that), and `to*` mappers turn the
 * API's JSON into the view types below. The mappers are pure so the shapes
 * the views depend on are pinned by unit tests without a network.
 */

/** The API returns at most this many rows per page; the whole item list fits. */
const PAGE_LIMIT = 10_000

// Picker shape: just enough to render a row in PickerPanel and rank in Fuse.
// `pack` is the alphabetically-first adventure pack the item drops in (an
// approximation for items that drop from quests in multiple packs — most
// items only have one source). For accurate "show items from pack X"
// filtering, use `fetchItemIdsByPack` rather than equality on this column.
export interface ItemRow {
  id: number
  name: string
  equipment_slot: string
  item_category: string
  minimum_level: number | null
  pack: string | null
  is_raid: boolean
}

// Detail shape: the core item, plus per-table relations rendered as their own
// `<DetailSection>`s by ItemDetail.
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

/** Fixed content upstream recorded for a socket: one entry is a crafted
 *  upgrade already applied, several are the choices a crafting step offers. */
export interface ItemAugmentSlotOption {
  name: string
  description: string | null
  min_level: number | null
}

export interface ItemAugmentSlot {
  sort_order: number
  /**
   * The socket's canonical label, from one closed vocabulary the ETL composes:
   * a bare colour (`red`, `colorless`, `sun`, `moon`, …) for a gem socket, or
   * `family: variant (qualifier)` for a crafting socket —
   * `lamordia: melancholic (accessory)`, `isle of dread: set bonus`,
   * `upgrade: tier 2`.
   *
   * Lower-case as stored; display casing is applied at render time by
   * `formatSlotLabel`. The view never parses it — `family` below is what says
   * what kind of socket this is. It is also the key `candidates` is indexed by.
   */
  label: string
  /** `standard` for a gem socket, otherwise the crafting family (`lamordia`,
   *  `dino`, `upgrade`, `crafting`). Read instead of pattern-matching the label. */
  family: string
  /** The augment pool a crafting socket draws from (`weapon` / `armor` /
   *  `accessory`) or a grade; null when the socket has neither. */
  qualifier: string | null
  options: ItemAugmentSlotOption[]
}

/** One augment that fits a slot: what the candidate dropdown renders. */
export interface AugmentCandidate {
  augment_id: number
  name: string
  min_level: number | null
  /** Bonus labels ("Charisma +5"), derived by the ETL from the augment's
   *  simple effects. Empty for augments whose effects are dice or conditions. */
  bonuses: string[]
}

export interface ItemBonus {
  bonus_id: number
  name: string
  description: string | null
  bonus_type: string | null
  /** The stat the bonus modifies (e.g. "Strength", "Fire Spell Power").
   *  Drives the per-row wiki link — links resolve to `https://ddowiki.com/page/<stat>`. */
  stat_name: string
  value: number | null
  sort_order: number
}

export interface ItemEffect {
  effect_id: number
  name: string
  description: string | null
  /** What the effect applies to when it says (`Fire`, `All`). */
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

/**
 * True when a socket belongs to a crafting family rather than being a gem colour.
 *
 * Reads the `family` column the ETL decomposes the label into, so the view
 * never pattern-matches a string to decide whether to draw a gem.
 */
export function isFamilySlot(family: string): boolean {
  return family !== 'standard'
}

/**
 * True when a socket should offer a list of candidate augments rather than just
 * a gem.
 *
 * The crafting families draw from a handful of purpose-made augments each, and
 * so do Sun and Moon — small enough lists to be useful. The other colours
 * accept hundreds and the gem says everything a browse view can. Exported so
 * the query layer and the view agree on one rule.
 *
 * Sun and Moon are identified by label because for a `standard` socket the
 * label *is* the colour — the vocabulary composes it from the variant alone.
 */
export function slotTakesCandidateList(family: string, label: string): boolean {
  return isFamilySlot(family) || label === 'sun' || label === 'moon'
}

/** Every item the picker might display. Search ranking happens client-side via
 *  Fuse.js. Sorted by descending minimum level so the highest-level items
 *  surface first; ties break by slot then name. Un-leveled items sort last. */
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

/** Adventure packs, for the picker's "Pack" filter dropdown. */
export async function fetchAdventurePacks(): Promise<string[]> {
  const packs = await apiGet<ApiAdventurePack[]>('/v1/adventure-packs')
  return packs.map((p) => p.name)
}

/** Stat names, for the picker's stat filter dropdown. */
export async function fetchStatOptions(): Promise<string[]> {
  const stats = await apiGet<ApiStat[]>('/v1/stats')
  return stats.map((s) => s.name).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
}

/** Ids of the items carrying a bonus to `stat`. */
export async function fetchItemIdsByStat(stat: string): Promise<Set<number>> {
  const page = await apiGet<ApiItemsPage>('/v1/items', { stat, limit: PAGE_LIMIT })
  return new Set(page.items.map((r) => r.id))
}

/** Ids of the items dropping from any quest in `pack`. */
export async function fetchItemIdsByPack(pack: string): Promise<Set<number>> {
  const page = await apiGet<ApiItemsPage>('/v1/items', { pack, limit: PAGE_LIMIT })
  return new Set(page.items.map((r) => r.id))
}

/** The augments that fit a socket, in the order a player scans them (level,
 *  then name). A socket with no matching augments returns an empty list. */
export async function fetchAugmentsForSlot(label: string): Promise<AugmentCandidate[]> {
  const page = await apiGet<ApiAugmentsPage>('/v1/augments', { slot: label, limit: PAGE_LIMIT })
  return page.augments.map(toAugmentCandidate).sort((a, b) => {
    if (a.min_level === null && b.min_level !== null) return 1
    if (b.min_level === null && a.min_level !== null) return -1
    if (a.min_level !== b.min_level) return (a.min_level ?? 0) - (b.min_level ?? 0)
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}
