import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import type { Database } from 'sql.js'
import { openProjectDb, seedTestDb } from '../../../test/fixtures/resourcesDb'
import { findRaidItemIds, listItems } from './items'

// Raid-ness now lives in the database (`quest_loot.loot_type`), populated by
// the Python pipeline — see scripts/src/ddo_data/game_data/raid_quests.py for
// why it's currently a hand-maintained backfill rather than a wiki scrape.
//
// This replaces the old raidQuests.test.ts, which validated a hardcoded name
// list in this file. The failure mode moved with the data: the risk is no
// longer "a typo'd quest name matches nothing" but "the shipped DB ships with
// the column empty", which would make the Raid filter silently return zero
// results. Both halves are covered below.

describe('findRaidItemIds against a seeded fixture', () => {
  let db: Database

  beforeAll(async () => {
    db = await seedTestDb()
  })

  afterAll(() => {
    db?.close()
  })

  it('returns items whose quest_loot row is tagged raid', () => {
    // Fixture: item 1 is raid loot, item 2 is chest loot.
    expect(findRaidItemIds(db)).toEqual(new Set([1]))
  })

  it('stamps is_raid onto the rows listItems returns', () => {
    const rows = listItems(db)
    const byId = new Map(rows.map((r) => [r.id, r]))
    expect(byId.get(1)?.is_raid).toBe(true)
    expect(byId.get(2)?.is_raid).toBe(false)
  })
})

describe('raid loot in the shipped database', () => {
  let db: Database

  beforeAll(async () => {
    db = await openProjectDb()
  })

  afterAll(() => {
    db?.close()
  })

  it('has the loot_type column on quest_loot', () => {
    const cols = db
      .exec("SELECT name FROM pragma_table_info('quest_loot')")[0]
      .values.map((r) => r[0])
    expect(cols).toContain('loot_type')
  })

  it('ships with loot_type actually populated', () => {
    // The whole point of the column. An empty column means the pipeline's
    // backfill didn't run before the DB was committed, and the Raid filter
    // would come back empty with no error anywhere.
    const [row] = db.exec(
      "SELECT COUNT(*) FROM quest_loot WHERE loot_type = 'raid'",
    )[0].values
    expect(Number(row[0])).toBeGreaterThan(100)
  })

  it('only stores loot_type values the schema allows', () => {
    const result = db.exec(
      "SELECT DISTINCT loot_type FROM quest_loot WHERE loot_type IS NOT NULL",
    )
    const values = result[0].values.map((r) => String(r[0]))
    expect(values.every((v) => ['chest', 'reward', 'raid'].includes(v))).toBe(true)
  })

  it('resolves to a non-trivial set of raid items', () => {
    expect(findRaidItemIds(db).size).toBeGreaterThan(100)
  })

  it('tags the highest-loot raids in the database', () => {
    // These were all untagged while the frontend used a hardcoded name list;
    // they double as regression coverage for that bug. The last four come
    // from the 2026-07-25 reconciliation against the wiki's Raids page
    // (browser passes the WAF; see raid_quests.py).
    //
    // Deliberately excludes The Vault of Night, The Shroud, The Lord of
    // Blades, and The Codex and the Shroud: those quests exist in `quests`
    // but have ZERO quest_loot rows, so there is nothing to tag. That's an
    // upstream scrape gap logged in docs/notes/DB Errors.md, not a defect in
    // the loot_type wiring.
    const expected = [
      'The Master Artificer',
      'Legendary Master Artificer',
      'The Curse of Strahd',
      'The Titan Awakes',
      'Ascension Chamber',
      "The Reaver's Fate",
      'Tower of Despair',
      'Fire Over Morgrave',
      'Relentless',
      'Hunt or Be Hunted',
      'Altar of Fecundity',
    ]
    const result = db.exec(`
      SELECT DISTINCT q.name
        FROM quest_loot ql
        JOIN quests q ON q.id = ql.quest_id
       WHERE ql.loot_type = 'raid'
    `)
    const tagged = new Set(result[0].values.map((r) => String(r[0])))
    const missing = expected.filter((name) => !tagged.has(name))
    expect(missing).toEqual([])
  })

  it('does not tag non-raid content as raid loot', () => {
    // Reign of Madness is a story arc, not a raid — it sat on the original
    // hardcoded list and wrongly tagged 7 items until the reconciliation
    // against the wiki's Raids page removed it.
    const result = db.exec(`
      SELECT DISTINCT q.name
        FROM quest_loot ql
        JOIN quests q ON q.id = ql.quest_id
       WHERE ql.loot_type = 'raid'
    `)
    const tagged = new Set(result[0].values.map((r) => String(r[0])))
    expect(tagged.has('Reign of Madness')).toBe(false)
    // The bogus scrape artifact must be gone entirely, not just untagged —
    // its rows were merged into The Chronoscope.
    const bogus = db.exec(
      "SELECT COUNT(*) FROM quests WHERE name = 'The Chronoscope reward items'",
    )[0].values[0][0]
    expect(Number(bogus)).toBe(0)
  })
})
