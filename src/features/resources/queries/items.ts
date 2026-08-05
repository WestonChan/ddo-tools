import type { Database } from 'sql.js'
import { runQuery, runQueryFirst } from './sqlHelpers'

/**
 * The exact `items.rarity` value the pipeline writes for rare loot.
 *
 * Shared so the filter and its tests can't drift from each other or from the
 * ETL: the Python writer emits `Rarity.RARE` ("Rare"), and
 * `etlRegression.test.ts` asserts the shipped database actually contains it.
 * Before rarity was populated, the filter compared against a string no row ever
 * held and quietly matched nothing.
 */
export const RARE_RARITY = 'Rare'

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
  /** The `augment_slot_types` row this socket is, and the key `slotCandidates`
   *  is indexed by. Two sockets of the same kind on one item share it. */
  slot_id: number
  /**
   * The socket's canonical label, from one closed vocabulary the ETL composes:
   * a bare colour (`red`, `colorless`, `sun`, `moon`, …) for a gem socket, or
   * `family: variant (qualifier)` for a crafting socket —
   * `lamordia: melancholic (accessory)`, `isle of dread: set bonus`,
   * `slaver's: prefix (legendary)`.
   *
   * Lower-case as stored; display casing is applied at render time by
   * `formatSlotLabel`. The view never parses it — `family` below is what says
   * what kind of socket this is.
   */
  label: string
  /** `standard` for a gem socket, otherwise the crafting family (`lamordia`,
   *  `dino`, `slavers`). Read instead of pattern-matching the label. */
  family: string
  /** The augment pool a crafting socket draws from (`weapon` / `armor` /
   *  `accessory`) or a Slaver's socket's `legendary` grade; null when the
   *  socket has neither. Carried so no consumer has to take it out of the
   *  label. */
  qualifier: string | null
}

/** One augment that fits a slot: what the candidate dropdown renders. */
export interface AugmentCandidate {
  augment_id: number
  name: string
  min_level: number | null
  /** Generated bonus labels ("Charisma +5"). Empty for the 430 shipped
   *  augments whose bonuses the pipeline has not resolved yet. */
  bonuses: string[]
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
  /** True when this particular drop is rare loot. Mapping-level, from
   *  `quest_loot.is_rare` — the same item can be a rare drop in one place and
   *  a guaranteed reward in another, which the item-level `rarity` can't say. */
  is_rare: boolean
}

export interface ItemDetail extends ItemCore {
  weaponStats: ItemWeaponStats | null
  armorStats: ItemArmorStats | null
  augmentSlots: ItemAugmentSlot[]
  /** Candidate augments per `slot_id`, for the sockets that get a dropdown
   *  (see `slotTakesCandidateList`). Plain colour sockets are absent: they
   *  accept hundreds of augments and render as a gem, not a list. */
  slotCandidates: Record<number, AugmentCandidate[]>
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
  const rows = runQuery<{ name: string }>(db, 'SELECT name FROM items WHERE id = ?', [id])
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

/**
 * The augments that fit a socket, in the order a player scans them (level, then
 * name), each with its bonus labels.
 *
 * Joined on `augments.slot_id`, the FK the pipeline backfills from the socket's
 * label — the wiki-sourced `slot_color` is a display fallback and is never
 * queried on. A socket with no matching augments returns an empty list, which
 * is correct for Slaver's sockets: Slave Lords crafting fills those with shards
 * rather than augments.
 */
export function getAugmentsForSlot(db: Database, slotId: number): AugmentCandidate[] {
  const rows = runQuery<{
    augment_id: number
    name: string
    min_level: number | null
    bonus: string | null
  }>(
    db,
    `SELECT a.id AS augment_id, a.name AS name, a.min_level AS min_level,
            b.name AS bonus
       FROM augments a
       LEFT JOIN augment_bonuses ab ON ab.augment_id = a.id
       LEFT JOIN bonuses b ON b.id = ab.bonus_id
      WHERE a.slot_id = ?
      ORDER BY a.min_level IS NULL, a.min_level, a.name COLLATE NOCASE,
               ab.sort_order`,
    [slotId],
  )

  // One row per (augment, bonus) — folded here rather than with GROUP_CONCAT
  // so a bonus name containing a comma stays one bonus.
  const byId = new Map<number, AugmentCandidate>()
  for (const row of rows) {
    let candidate = byId.get(row.augment_id)
    if (!candidate) {
      candidate = {
        augment_id: row.augment_id,
        name: row.name,
        min_level: row.min_level,
        bonuses: [],
      }
      byId.set(row.augment_id, candidate)
    }
    if (row.bonus) candidate.bonuses.push(row.bonus)
  }
  return [...byId.values()]
}

export function getItemDetail(db: Database, id: number): ItemDetail | null {
  // Column list matches ItemCore exactly. `level`, `base_value`, and `icon`
  // exist on the table but no UI surfaces them — add them back here when
  // something renders them, rather than paying for columns nobody reads.
  const core = runQueryFirst<ItemCore>(
    db,
    `SELECT id, name, rarity, equipment_slot, item_category, minimum_level,
            material, binding, tooltip,
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
    `SELECT s.sort_order AS sort_order, s.slot_id AS slot_id, t.label AS label,
            t.family AS family, t.qualifier AS qualifier
       FROM item_augment_slots s
       JOIN augment_slot_types t ON t.id = s.slot_id
       WHERE s.item_id = ?
       ORDER BY s.sort_order`,
    [id],
  )

  // One query per distinct socket, not per slot: an item with two Lamordia
  // accessory sockets offers the same augments in both.
  const slotCandidates: Record<number, AugmentCandidate[]> = {}
  for (const slot of augmentSlots) {
    if (!slotTakesCandidateList(slot.family, slot.label)) continue
    if (slot.slot_id in slotCandidates) continue
    slotCandidates[slot.slot_id] = getAugmentsForSlot(db, slot.slot_id)
  }

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
  const quests = runQuery<Omit<ItemQuestRef, 'is_rare'> & { is_rare: number }>(
    db,
    `SELECT q.id AS quest_id, q.name AS name, q.level AS level,
            ap.name AS pack, p.name AS patron, q.zone AS zone,
            q.npc AS npc, ql.is_rare AS is_rare
       FROM quest_loot ql
       JOIN quests q ON q.id = ql.quest_id
       LEFT JOIN adventure_packs ap ON ap.id = q.pack_id
       LEFT JOIN patrons p ON p.id = q.patron_id
       WHERE ql.item_id = ?
       ORDER BY q.level, q.name`,
    [id],
  ).map((q) => ({ ...q, is_rare: q.is_rare === 1 }))

  return {
    ...core,
    weaponStats,
    armorStats,
    augmentSlots,
    slotCandidates,
    upgrades,
    bonuses,
    effects,
    spellLinks,
    quests,
  }
}
