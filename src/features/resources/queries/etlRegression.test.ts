import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Database } from 'sql.js'
import { openProjectDb } from '../../../test/fixtures/resourcesDb'
import { RARE_RARITY } from './items'

// Assertions against the REAL shipped database (public/data/ddo.db), in the
// spirit of raidLoot.test.ts: hand-written fixtures cannot catch an ETL
// regression, because the fixture is whatever we typed rather than whatever the
// pipeline produced. Every check here failed against the database as shipped
// before Phase 4c, and each one corresponds to something a user sees.
//
// The pipeline guards the same invariants at build time (db/validate.py A1-A6);
// these are the frontend's own tripwire for the case where a database is
// committed without the pipeline having run.

// Matches a real HTML entity reference — named, decimal, or hex. Deliberately
// not `LIKE '%&%;%'`: descriptions legitimately contain a bare ampersand
// ("Doublestrike & Doubleshot") followed later by a semicolon, and matching
// those produced a false positive on a perfectly clean row.
const ENTITY = /&(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]{1,8});/

function scalar(db: Database, sql: string): number {
  return Number(db.exec(sql)[0].values[0][0])
}

function column(db: Database, sql: string): string[] {
  const result = db.exec(sql)
  if (result.length === 0) return []
  return result[0].values.map((row) => String(row[0]))
}

describe('ETL regression: the shipped database', () => {
  let db: Database

  beforeAll(async () => {
    db = await openProjectDb()
  })

  afterAll(() => {
    db?.close()
  })

  describe('HTML entities are decoded before storage', () => {
    // 91 rows across 7 TEXT columns shipped with raw entities, so item names
    // rendered as "Admiral&#39;s Gloves" in the picker and the detail header.
    const USER_VISIBLE_COLUMNS: ReadonlyArray<readonly [string, string]> = [
      ['items', 'name'],
      ['items', 'icon'],
      ['items', 'description'],
      ['items', 'tooltip'],
      ['bonuses', 'name'],
      ['bonuses', 'description'],
      ['effects', 'name'],
      ['quests', 'name'],
      ['feats', 'name'],
      ['feats', 'description'],
      ['feats', 'note'],
      ['feats', 'prerequisite'],
      ['crafting_options', 'name'],
      ['crafting_options', 'description'],
      ['filigrees', 'name'],
      ['filigrees', 'bonus'],
    ]

    it.each(USER_VISIBLE_COLUMNS)('%s.%s holds no entity references', (table, col) => {
      const offenders = column(
        db,
        `SELECT ${col} FROM ${table} WHERE ${col} LIKE '%&%;%' LIMIT 50`,
      ).filter((value) => ENTITY.test(value))
      expect(offenders).toEqual([])
    })
  })

  describe('templates are expanded, not stored raw', () => {
    it('leaves no MediaWiki template in bonuses.description', () => {
      // 3,929 of 4,948 rows carried raw `{{...}}`. The frontend used to strip
      // it at render time (EnchantmentList.cleanDescription), which meant a
      // bonus whose description was nothing but a template showed no text.
      expect(scalar(db, "SELECT COUNT(*) FROM bonuses WHERE description LIKE '%{{%'")).toBe(0)
    })

    it('leaves no MediaWiki template in effects.modifier', () => {
      expect(scalar(db, "SELECT COUNT(*) FROM effects WHERE modifier LIKE '%{{%'")).toBe(0)
    })

    it.each([
      ['bonuses'],
      ['crafting_options'],
      ['crafting_enchantments'],
      ['item_materials'],
      ['items'],
      ['effects'],
    ])('leaves no wiki or HTML markup in %s.name', (table) => {
      // A name is a label, so markup in it is raw wikitext leaking through: four
      // bonuses were named after a whole sentence containing `[[Bluff]]`, 380
      // crafting options ended in `<br />`, and a material was named 'No <!--'.
      // Descriptions are a separate question and deliberately not asserted here.
      const offenders = column(
        db,
        `SELECT name FROM ${table}
          WHERE name LIKE '%[[%' OR name LIKE '%{{%'
             OR name LIKE '%<%>%' OR name LIKE '%<!--%'
          LIMIT 20`,
      )
      expect(offenders).toEqual([])
    })

    it('has no item named after the leftovers of a stripped template', () => {
      // Seven items were named "(level 12)" / "(Level 20)": the name field was
      // `{{Item|Crystallized Eternity}} (level 12)` and the template — the only
      // part holding the name — was deleted rather than expanded.
      expect(column(db, "SELECT name FROM items WHERE name LIKE '(%'")).toEqual([])
    })
  })

  describe('magnitudes live in the value column', () => {
    it('keeps bare magnitudes out of effects.modifier', () => {
      // `modifier` is the bonus type. {{Incite|59|Insightful}} used to store
      // "59" there and throw "Insightful" away, so a number rendered in the
      // Enchantments type-chip column. Ordinals like {{Burns|3rd}} are real
      // modifiers and stay.
      const offenders = column(
        db,
        `SELECT name || ' / ' || modifier FROM effects
          WHERE modifier GLOB '[0-9+-]*' AND NOT modifier GLOB '*[^0-9+%-]*'`,
      )
      expect(offenders).toEqual([])
    })

    it('generates bonus names with a single sign', () => {
      // 17 rows were named "Constitution +-2". The name is part of the bonuses
      // unique index, so the malformed form was load-bearing.
      expect(column(db, "SELECT name FROM bonuses WHERE name LIKE '%+-%'")).toEqual([])
    })

    it('names a negative bonus with a minus sign', () => {
      // 18 penalties read "+2" while `value` said -2: the variant collapse
      // grouped names by dropping punctuation, so "-2" and "+2" shared a key and
      // the penalty was folded onto its bonus twin.
      const offenders = column(
        db,
        `SELECT name || ' / ' || value FROM bonuses
          WHERE value < 0 AND name NOT LIKE '%-%' LIMIT 20`,
      )
      expect(offenders).toEqual([])
    })
  })

  describe('rarity is populated', () => {
    it(`marks items with rarity = '${RARE_RARITY}'`, () => {
      // The column was 100% empty while the picker's "Rare only" filter
      // compared against this exact string — so the filter matched nothing and
      // reported "no matches" for every combination.
      expect(
        scalar(db, `SELECT COUNT(*) FROM items WHERE rarity = '${RARE_RARITY}'`),
      ).toBeGreaterThan(100)
    })

    it('uses only rarity values the schema allows', () => {
      const values = column(db, 'SELECT DISTINCT rarity FROM items WHERE rarity IS NOT NULL')
      expect(values.every((v) => ['Common', 'Uncommon', 'Rare', 'Epic'].includes(v))).toBe(true)
    })

    it('multiplies rare-ness across quest_loot mappings', () => {
      expect(scalar(db, 'SELECT COUNT(*) FROM quest_loot WHERE is_rare = 1')).toBeGreaterThan(0)
    })

    it('flags rare augments, where the Lunar/Solar Gems live', () => {
      expect(scalar(db, 'SELECT COUNT(*) FROM augments WHERE is_rare = 1')).toBeGreaterThan(0)
    })

    it('never flags a quest_loot row whose item is not rare', () => {
      expect(
        scalar(
          db,
          `SELECT COUNT(*) FROM quest_loot ql
             JOIN items i ON i.id = ql.item_id
            WHERE ql.is_rare = 1 AND COALESCE(i.rarity, '') != '${RARE_RARITY}'`,
        ),
      ).toBe(0)
    })
  })

  describe('unique_enchantments', () => {
    it('ships populated', () => {
      // The dictionary of what a named enchantment actually does — the source
      // of the description text bonuses used to lack entirely.
      expect(scalar(db, 'SELECT COUNT(*) FROM unique_enchantments')).toBeGreaterThan(100)
    })

    it('stores an effect text for most entries', () => {
      const total = scalar(db, 'SELECT COUNT(*) FROM unique_enchantments')
      const withEffect = scalar(
        db,
        'SELECT COUNT(*) FROM unique_enchantments WHERE effect IS NOT NULL',
      )
      expect(withEffect).toBeGreaterThan(total / 2)
    })

    it('never stores an empty string where it means NULL', () => {
      expect(scalar(db, "SELECT COUNT(*) FROM unique_enchantments WHERE effect = ''")).toBe(0)
    })

    it('is referenced by both bonuses and effects', () => {
      // Nullable on both sides on purpose: formatter-template bonuses have no
      // enchantment page. But if neither side links, the table is dead weight.
      expect(
        scalar(db, 'SELECT COUNT(*) FROM bonuses WHERE unique_enchantment_id IS NOT NULL'),
      ).toBeGreaterThan(0)
      expect(
        scalar(db, 'SELECT COUNT(*) FROM effects WHERE unique_enchantment_id IS NOT NULL'),
      ).toBeGreaterThan(0)
    })
  })

  describe('stat identity', () => {
    it('records spell saving throws as Spell Save, not Spell Resistance', () => {
      // A spell save runs 1-8; Spell Resistance is a caster-level check running
      // 17-41. All 19 rows resolved to Spell Resistance, so 18 items looked
      // like they carried the same enchantment twice.
      expect(scalar(db, 'SELECT COUNT(*) FROM bonuses WHERE stat_id = 177')).toBeGreaterThan(0)
    })
  })

  describe('name normalization', () => {
    it('stores one spelling per effect name', () => {
      // 19 variant groups over 462 rows: Clicky/clicky (191+41),
      // Armor-Piercing/ArmorPiercing, and a "|* Random effect:" whose leading
      // pipe came from a wiki table cell.
      const groups = db.exec(`
        SELECT lower(replace(replace(replace(name, '-', ''), ' ', ''), '_', '')) AS k,
               group_concat(DISTINCT name)
          FROM effects
         GROUP BY k HAVING COUNT(DISTINCT name) > 1
      `)
      const offenders = groups.length === 0 ? [] : groups[0].values.map((r) => String(r[1]))
      expect(offenders).toEqual([])
    })

    it('stores one spelling per material name', () => {
      const groups = db.exec(`
        SELECT lower(replace(name, ' ', '')) AS k, group_concat(DISTINCT name)
          FROM item_materials
         GROUP BY k HAVING COUNT(DISTINCT name) > 1
      `)
      const offenders = groups.length === 0 ? [] : groups[0].values.map((r) => String(r[1]))
      expect(offenders).toEqual([])
    })

    it('stores one casing per weapon ability modifier', () => {
      // `attack_mod` held both 'STR' and 'Str', so any consumer filtering on
      // one silently missed the other.
      const values = column(
        db,
        'SELECT DISTINCT attack_mod FROM item_weapon_stats WHERE attack_mod IS NOT NULL',
      )
      const lowered = values.map((v) => v.toLowerCase())
      expect(new Set(lowered).size).toBe(values.length)
    })
  })
})
