import type { Database } from 'sql.js'
import { runQuery, runQueryFirst } from './sqlHelpers'

// Picker shape: just enough to render a row in PickerPanel and rank in Fuse.
// `pack` is the alphabetically-first adventure pack the item drops in (an
// approximation for items that drop from quests in multiple packs — most
// items only have one source). For accurate "show items from pack X"
// filtering, use `findItemIdsByPack` rather than equality on this column.
// `is_raid` is true if any of the item's quest sources is tagged as raid loot
// in `quest_loot.loot_type` (computed via `findRaidItemIds`). It is stamped on
// every row, so the picker's "Raid only" filter reads it directly rather than
// re-querying.
export interface ItemRow {
  id: number
  name: string
  rarity: string | null
  equipment_slot: string | null
  minimum_level: number | null
  pack: string | null
  is_raid: boolean
}

// Detail shape: the core item, plus per-table relations rendered as their own
// `<DetailSection>`s by ItemDetail.
export interface ItemCore {
  id: number
  name: string
  rarity: string | null
  equipment_slot: string | null
  item_category: string | null
  minimum_level: number | null
  enhancement_bonus: number | null
  material: string | null
  binding: string | null
  tooltip: string | null
  description: string | null
  wiki_url: string | null
}

export interface ItemWeaponStats {
  damage: string | null
  critical: string | null
  weapon_type: string | null
  proficiency: string | null
  handedness: string | null
}

export interface ItemArmorStats {
  armor_bonus: number | null
  max_dex_bonus: number | null
}

export interface ItemAugmentSlot {
  sort_order: number
  slot_type: string
}

export interface ItemUpgrade {
  base_item_id: number
  upgrade_tier: number
}

export interface ItemBonus {
  bonus_id: number
  name: string
  description: string | null
  bonus_type: string | null
  /** The underlying stat the bonus modifies (e.g. "Strength", "Spell Power").
   *  Null for non-stat bonuses (e.g. "On hit: -1 AC to target"). Drives the
   *  per-row wiki link — links resolve to `https://ddowiki.com/page/<stat>`. */
  stat_name: string | null
  value: number | null
  sort_order: number
}

export interface ItemEffect {
  effect_id: number
  name: string
  modifier: string | null
  value: number | null
  sort_order: number
}

export interface ItemSpellLink {
  spell_id: number
  name: string
  charges: number | null
}

export interface ItemQuestRef {
  quest_id: number
  name: string
  level: number | null
  pack: string | null
  patron: string | null
  zone: string | null
  npc: string | null
}

export interface ItemDetail extends ItemCore {
  weaponStats: ItemWeaponStats | null
  armorStats: ItemArmorStats | null
  augmentSlots: ItemAugmentSlot[]
  upgrades: ItemUpgrade[]
  bonuses: ItemBonus[]
  effects: ItemEffect[]
  spellLinks: ItemSpellLink[]
  quests: ItemQuestRef[]
}

/** Distinct stat names referenced by any item bonus. Populates the picker's
 *  stat filter dropdown. */
export function listBonusStats(db: Database): string[] {
  return runQuery<{ name: string }>(
    db,
    `SELECT DISTINCT s.name AS name
       FROM stats s
       JOIN bonuses b ON b.stat_id = s.id
       JOIN item_bonuses ib ON ib.bonus_id = b.id
       ORDER BY s.name COLLATE NOCASE`,
  ).map((r) => r.name)
}

/**
 * Return the set of item IDs that drop from a raid.
 *
 * Reads `quest_loot.loot_type`, which the Python pipeline populates from the
 * wiki's own loot categories (`Chest_loot` / `Quest_rewards` / `Raid_loot`).
 * This replaced a hardcoded list of raid quest names in this file — five of
 * those names matched no quest row, silently hiding 262 items.
 *
 * Note the column is currently filled by an offline backfill rather than a
 * live scrape (ddowiki is behind a WAF challenge) — see
 * `scripts/src/ddo_data/game_data/raid_quests.py`. That's invisible from here:
 * either way the answer comes from the DB.
 */
export function findRaidItemIds(db: Database): Set<number> {
  const rows = runQuery<{ item_id: number }>(
    db,
    `SELECT DISTINCT item_id
       FROM quest_loot
      WHERE loot_type = 'raid'`,
  )
  return new Set(rows.map((r) => r.item_id))
}

/**
 * Return the set of item IDs that carry a bonus boosting ANY of the listed
 * stats (OR semantics — a player browsing for "Cha or Wis gear" expects
 * everything matching either). Returns an empty set when no stats are
 * passed; callers should skip the call entirely in that case.
 */
export function findItemIdsByStats(db: Database, stats: readonly string[]): Set<number> {
  if (stats.length === 0) return new Set()
  const placeholders = stats.map(() => '?').join(', ')
  const rows = runQuery<{ item_id: number }>(
    db,
    `SELECT DISTINCT ib.item_id AS item_id
       FROM item_bonuses ib
       JOIN bonuses b ON b.id = ib.bonus_id
       JOIN stats s ON s.id = b.stat_id
      WHERE s.name IN (${placeholders})`,
    stats as unknown as string[],
  )
  return new Set(rows.map((r) => r.item_id))
}

/** Lightweight name lookup — used by the breadcrumb to resolve display
 *  labels for stack entries that don't carry a name yet (e.g., URL-seeded
 *  depth-1 entries). One indexed-PK query, sub-millisecond. */
export function findItemNameById(db: Database, id: number): string | null {
  const rows = runQuery<{ name: string }>(
    db,
    'SELECT name FROM items WHERE id = ?',
    [id],
  )
  return rows[0]?.name ?? null
}

// Pull every item the picker might display. Search ranking happens client-side
// via Fuse.js — the SQL layer just hands over the raw rows in a stable initial
// order. Default sort is descending `minimum_level` so the highest-level items
// surface first; ties break by slot then name for deterministic ordering
// within a level band. The leading `minimum_level IS NULL` term sorts
// un-leveled placeholder items last rather than letting them dominate the top
// (SQLite has no `NULLS LAST` in this position).
//
// The `pack` correlated subquery picks the alphabetically-first adventure
// pack across the item's quest sources (cheap approximation; most items drop
// in one pack). `is_raid` is applied in JS from one `findRaidItemIds` set
// lookup rather than a correlated EXISTS per row — one query, O(1) per row.
export function listItems(db: Database): ItemRow[] {
  const rows = runQuery<Omit<ItemRow, 'is_raid'>>(
    db,
    `SELECT i.id, i.name, i.rarity, i.equipment_slot, i.minimum_level,
            (SELECT MIN(ap.name)
               FROM quest_loot ql
               JOIN quests q ON q.id = ql.quest_id
               LEFT JOIN adventure_packs ap ON ap.id = q.pack_id
               WHERE ql.item_id = i.id) AS pack
       FROM items i
       ORDER BY i.minimum_level IS NULL, i.minimum_level DESC,
                i.equipment_slot, i.name COLLATE NOCASE`,
  )
  const raidIds = findRaidItemIds(db)
  return rows.map((r) => ({ ...r, is_raid: raidIds.has(r.id) }))
}

/** Distinct adventure-pack names that have at least one item-dropping quest.
 *  Powers the picker's "Pack" filter dropdown — packs with no droppable items
 *  would just be empty options. */
export function listAdventurePacks(db: Database): string[] {
  return runQuery<{ name: string }>(
    db,
    `SELECT DISTINCT ap.name AS name
       FROM adventure_packs ap
       JOIN quests q ON q.pack_id = ap.id
       JOIN quest_loot ql ON ql.quest_id = q.id
       ORDER BY ap.name COLLATE NOCASE`,
  ).map((r) => r.name)
}

/** Items that drop from any quest in the given adventure pack. Returns a Set
 *  for O(1) membership checks during PickerPanel's filter pass. The display
 *  column `ItemRow.pack` is alphabetically-first only — for "items from this
 *  pack" semantics we need the full source set, hence this query. */
export function findItemIdsByPack(db: Database, pack: string): Set<number> {
  const rows = runQuery<{ item_id: number }>(
    db,
    `SELECT DISTINCT ql.item_id AS item_id
       FROM quest_loot ql
       JOIN quests q ON q.id = ql.quest_id
       JOIN adventure_packs ap ON ap.id = q.pack_id
       WHERE ap.name = ?`,
    [pack],
  )
  return new Set(rows.map((r) => r.item_id))
}

export function getItemDetail(db: Database, id: number): ItemDetail | null {
  // Column list matches ItemCore exactly. `level`, `base_value`, and `icon`
  // exist on the table but no UI surfaces them — add them back here when
  // something renders them, rather than paying for columns nobody reads.
  const core = runQueryFirst<ItemCore>(
    db,
    `SELECT id, name, rarity, equipment_slot, item_category, minimum_level,
            enhancement_bonus, material, binding, tooltip,
            description, wiki_url
       FROM items
       WHERE id = ?`,
    [id],
  )
  if (!core) return null

  const weaponStats = runQueryFirst<ItemWeaponStats>(
    db,
    `SELECT damage, critical, weapon_type, proficiency, handedness
       FROM item_weapon_stats
       WHERE item_id = ?`,
    [id],
  )

  const armorStats = runQueryFirst<ItemArmorStats>(
    db,
    `SELECT armor_bonus, max_dex_bonus
       FROM item_armor_stats
       WHERE item_id = ?`,
    [id],
  )

  const augmentSlots = runQuery<ItemAugmentSlot>(
    db,
    `SELECT sort_order, slot_type
       FROM item_augment_slots
       WHERE item_id = ?
       ORDER BY sort_order`,
    [id],
  )

  const upgrades = runQuery<ItemUpgrade>(
    db,
    `SELECT base_item_id, upgrade_tier
       FROM item_upgrades
       WHERE item_id = ?
       ORDER BY upgrade_tier`,
    [id],
  )

  const bonuses = runQuery<ItemBonus>(
    db,
    `SELECT b.id AS bonus_id, b.name AS name, b.description AS description,
            bt.name AS bonus_type, s.name AS stat_name,
            b.value AS value, ib.sort_order AS sort_order
       FROM item_bonuses ib
       JOIN bonuses b ON b.id = ib.bonus_id
       LEFT JOIN bonus_types bt ON bt.id = b.bonus_type_id
       LEFT JOIN stats s ON s.id = b.stat_id
       WHERE ib.item_id = ?
       ORDER BY ib.sort_order`,
    [id],
  )

  const effects = runQuery<ItemEffect>(
    db,
    `SELECT e.id AS effect_id, e.name AS name, e.modifier AS modifier,
            ie.value AS value, ie.sort_order AS sort_order
       FROM item_effects ie
       JOIN effects e ON e.id = ie.effect_id
       WHERE ie.item_id = ?
       ORDER BY ie.sort_order`,
    [id],
  )

  const spellLinks = runQuery<ItemSpellLink>(
    db,
    `SELECT s.id AS spell_id, s.name AS name, isl.charges AS charges
       FROM item_spell_links isl
       JOIN spells s ON s.id = isl.spell_id
       WHERE isl.item_id = ?
       ORDER BY s.name`,
    [id],
  )

  // `q.npc` is read but the column is universally null today — the ETL doesn't
  // populate it yet (see Phase 4c in docs/roadmap.md). The UI already filters
  // null segments out, so this is harmless pre-wiring; once the scraper ships
  // npc data, the meta line surfaces it without a frontend change.
  const quests = runQuery<ItemQuestRef>(
    db,
    `SELECT q.id AS quest_id, q.name AS name, q.level AS level,
            ap.name AS pack, p.name AS patron, q.zone AS zone,
            q.npc AS npc
       FROM quest_loot ql
       JOIN quests q ON q.id = ql.quest_id
       LEFT JOIN adventure_packs ap ON ap.id = q.pack_id
       LEFT JOIN patrons p ON p.id = q.patron_id
       WHERE ql.item_id = ?
       ORDER BY q.level, q.name`,
    [id],
  )

  return {
    ...core,
    weaponStats,
    armorStats,
    augmentSlots,
    upgrades,
    bonuses,
    effects,
    spellLinks,
    quests,
  }
}
