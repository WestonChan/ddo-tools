import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import type { Database } from 'sql.js'
import { seedTestDb } from '../test/fixtures/resourcesDb'
import {
  validateSchema,
  dbFetchCacheMode,
  SCHEMA_HEAL_KEY,
  DbError,
  DB_ERROR_SCHEMA,
} from './useDatabase'

// Regression coverage for the stale-service-worker incident (2026-07-25):
// public/sw.js serves ddo.db cache-first, so after a deploy that adds a
// column, returning browsers run NEW code against the OLD cached DB for at
// least one page load — a CACHE_NAME bump cannot close that window. The old
// validateSchema only checked `SELECT COUNT(*) FROM items`, so the stale DB
// passed the gate and crashed later inside a view ("no such column:
// loot_type") where no recovery UI exists. Validation must assert every
// schema feature the frontend queries, so staleness is caught AT THE GATE,
// where DatabaseGate's clear-cache recovery lives.
describe('validateSchema', () => {
  let db: Database

  beforeAll(async () => {
    db = await seedTestDb()
  })

  afterAll(() => {
    db?.close()
  })

  it('accepts a database with the current schema', () => {
    expect(() => validateSchema(db)).not.toThrow()
  })

  it('rejects a database missing quest_loot.loot_type as DB_ERROR_SCHEMA', async () => {
    const stale = await seedTestDb()
    try {
      // Recreate the pre-migration table shape (the state a stale SW cache
      // serves): quest_loot without loot_type.
      stale.run(`
        DROP TABLE quest_loot;
        CREATE TABLE quest_loot (
          quest_id INTEGER NOT NULL,
          item_id  INTEGER NOT NULL,
          PRIMARY KEY (quest_id, item_id)
        );
      `)
      let thrown: unknown = null
      try {
        validateSchema(stale)
      } catch (err) {
        thrown = err
      }
      expect(thrown).toBeInstanceOf(DbError)
      expect((thrown as DbError).kind).toBe(DB_ERROR_SCHEMA)
      // Message names the missing column so Sentry reports are actionable.
      expect((thrown as DbError).message).toMatch(/quest_loot\.loot_type/)
    } finally {
      stale.close()
    }
  })

  it('rejects a database missing a required table entirely', async () => {
    const stale = await seedTestDb()
    try {
      stale.run('DROP TABLE quest_loot;')
      expect(() => validateSchema(stale)).toThrow(DbError)
    } finally {
      stale.close()
    }
  })

  it('still rejects an empty items table', async () => {
    const empty = await seedTestDb()
    try {
      empty.run('DELETE FROM items;')
      let thrown: unknown = null
      try {
        validateSchema(empty)
      } catch (err) {
        thrown = err
      }
      expect(thrown).toBeInstanceOf(DbError)
      expect((thrown as DbError).kind).toBe(DB_ERROR_SCHEMA)
    } finally {
      empty.close()
    }
  })
})

// The DB is served through two cache layers: the service worker's Cache
// Storage AND the browser's HTTP cache. DatabaseGate's self-heal clears the
// first, but the post-heal refetch must also bypass the second or GitHub
// Pages' max-age can hand back the same stale bytes — burning the one heal
// attempt and parking the user on the error screen.
describe('dbFetchCacheMode', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('uses default HTTP caching on a normal load', () => {
    expect(dbFetchCacheMode()).toBe('default')
  })

  it('bypasses the HTTP cache when a schema heal is in flight', () => {
    sessionStorage.setItem(SCHEMA_HEAL_KEY, '1')
    expect(dbFetchCacheMode()).toBe('reload')
  })
})
