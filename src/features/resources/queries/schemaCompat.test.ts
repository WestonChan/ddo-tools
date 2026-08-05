import { describe, it, expect } from 'vitest'
import type { Database } from 'sql.js'
import { openProjectDb, seedBaselineDb, seedTestDb } from '../../../test/fixtures/resourcesDb'
import { REQUIRED_COLUMNS, validateSchema } from '../../../hooks/useDatabase'
import {
  findItemIdsByPack,
  findItemIdsByStats,
  findItemNameById,
  findRaidItemIds,
  getAugmentsForSlot,
  getItemDetail,
  listAdventurePacks,
  listBonusStats,
  listItems,
} from './items'

// The whole frontend query surface, each with representative args. EXTEND
// THIS LIST when adding a query function — the tests below run every entry
// against three database vintages.
const QUERY_SURFACE: ReadonlyArray<readonly [name: string, run: (db: Database) => unknown]> = [
  ['listItems', (db) => listItems(db)],
  ['listBonusStats', (db) => listBonusStats(db)],
  ['listAdventurePacks', (db) => listAdventurePacks(db)],
  ['findRaidItemIds', (db) => findRaidItemIds(db)],
  ['findItemIdsByStats', (db) => findItemIdsByStats(db, ['Charisma'])],
  ['findItemIdsByPack', (db) => findItemIdsByPack(db, 'Mists of Ravenloft')],
  ['findItemNameById', (db) => findItemNameById(db, 1)],
  ['getItemDetail', (db) => getItemDetail(db, 1)],
  // Socket 4 is Sun in the current fixture; against the shipped DB any id runs
  // the same query, and against the baseline the table is missing outright.
  ['getAugmentsForSlot', (db) => getAugmentsForSlot(db, 4)],
]

// Why these tests exist: when the stale-service-worker incident broke the
// live site (2026-07-25), the entire suite was green. Query tests only ever
// ran against the up-to-date fixture or the already-migrated shipped DB —
// no test modeled the state production actually serves: NEW code against an
// OLD cached database. These tests encode that state permanently.
describe('query surface vs the frozen baseline schema', () => {
  // The runtime contract: any DB that validateSchema ACCEPTS must be safe
  // for every query. Equivalently: every query that needs more than the
  // baseline schema must be backed by a REQUIRED_COLUMNS entry, so
  // validateSchema REJECTS old DBs at the gate (where self-heal lives)
  // instead of letting them crash a view.
  it('rejects the baseline DB at the gate (it predates required columns)', async () => {
    const baseline = await seedBaselineDb()
    try {
      expect(() => validateSchema(baseline)).toThrow(/quest_loot\.loot_type/)
    } finally {
      baseline.close()
    }
  })

  it('covers every baseline query failure with a REQUIRED_COLUMNS entry', async () => {
    const baseline = await seedBaselineDb()
    const requiredColumns = new Set(REQUIRED_COLUMNS.map(([, column]) => column))
    const requiredTables = new Set(REQUIRED_COLUMNS.map(([table]) => table))
    const uncovered: string[] = []
    let failures = 0
    try {
      for (const [name, run] of QUERY_SURFACE) {
        try {
          run(baseline)
        } catch (err) {
          failures += 1
          const message = err instanceof Error ? err.message : String(err)
          // SQLite reports qualified references verbatim ("no such column:
          // ql.loot_type"), so strip any alias prefix before matching, and
          // treat a missing table as covered when the table is declared.
          const rawName = /no such (?:column|table): ([\w.]+)/.exec(message)?.[1]
          const missing = rawName?.split('.').pop()
          const covered =
            missing !== undefined && (requiredColumns.has(missing) || requiredTables.has(missing))
          if (!covered) {
            uncovered.push(
              `${name} failed against the baseline schema (${message}) but ` +
                `REQUIRED_COLUMNS does not cover it — add the [table, column] ` +
                `entry in src/hooks/useDatabase.ts so stale cached DBs are ` +
                `rejected at the gate instead of crashing this query in a view.`,
            )
          }
        }
      }
      expect(uncovered).toEqual([])
      // Meta-assertion: the baseline must actually diverge from current
      // (findRaidItemIds needs loot_type). If nothing fails here, the
      // baseline has been "helpfully" updated and the test is vacuous.
      expect(failures).toBeGreaterThan(0)
    } finally {
      baseline.close()
    }
  })

  it('keeps every REQUIRED_COLUMNS entry genuinely post-baseline', async () => {
    // The inverse invariant: if an entry's column EXISTS in the frozen
    // baseline, either the entry is stale or someone regenerated
    // baselineSchema.sql from the current DB — both defeat the tripwire.
    const baseline = await seedBaselineDb()
    try {
      const alreadyPresent: string[] = []
      for (const [table, column] of REQUIRED_COLUMNS) {
        const result = baseline.exec(
          `SELECT COUNT(*) FROM pragma_table_info('${table}') WHERE name = '${column}'`,
        )
        if (Number(result[0]?.values[0]?.[0] ?? 0) > 0) {
          alreadyPresent.push(`${table}.${column}`)
        }
      }
      expect(alreadyPresent).toEqual([])
    } finally {
      baseline.close()
    }
  })

  it('runs the full query surface against the current fixture', async () => {
    const db = await seedTestDb()
    try {
      for (const [, run] of QUERY_SURFACE) {
        run(db)
      }
    } finally {
      db.close()
    }
  })
})

describe('fixture schema vs the shipped database', () => {
  // The fixture must not drift from reality: every table it creates has to
  // be byte-identical to the shipped DB's CREATE statement. Historically the
  // fixture was a hand-copied "slimmed" schema, which let tests assert
  // behavior against data that cannot exist in production (item_category
  // 'Greatsword' vs the real CHECK constraint, handedness 'Two-Handed' vs
  // 'Two-handed', stats without the NOT NULL category). seedTestDb now
  // executes the real DB's own CREATE statements, so this test is the tripwire
  // for anyone reverting to hand-written DDL.
  it('creates every fixture table with the shipped CREATE statement', async () => {
    const fixture = await seedTestDb()
    const real = await openProjectDb()
    try {
      const rows = fixture.exec(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )[0].values
      expect(rows.length).toBeGreaterThan(0)
      const mismatches: string[] = []
      for (const [name, sql] of rows) {
        const realSql = real.exec(
          "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?",
          [name],
        )[0]?.values[0]?.[0]
        if (realSql === undefined) {
          mismatches.push(`${String(name)}: not present in public/data/ddo.db`)
        } else if (realSql !== sql) {
          mismatches.push(`${String(name)}: fixture DDL differs from the shipped DB`)
        }
      }
      expect(mismatches).toEqual([])
    } finally {
      fixture.close()
      real.close()
    }
  })
})

describe('query surface vs the shipped database', () => {
  // Guards against fixture/reality drift: the fixture DDL is hand-written,
  // so a query can pass fixture tests while referencing a column the real
  // public/data/ddo.db doesn't have. Committed queries and the committed DB
  // must never diverge.
  it('every query function runs against public/data/ddo.db', async () => {
    const db = await openProjectDb()
    try {
      for (const [, run] of QUERY_SURFACE) {
        run(db)
      }
      expect(validateSchema(db)).toBeUndefined()
    } finally {
      db.close()
    }
  })
})
