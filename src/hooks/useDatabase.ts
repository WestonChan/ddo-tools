import { useSyncExternalStore } from 'react'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'

const DB_URL = import.meta.env.BASE_URL + 'data/ddo.db'
const DB_FETCH_TIMEOUT_MS = 60_000

/** One-shot guard for DatabaseGate's automatic schema-error heal.
 *  sessionStorage, not localStorage: a browser restart gets a fresh attempt.
 *  Lives here (not in DatabaseGate) because `loadDb` also reads it to pick
 *  the fetch cache mode for the post-heal reload. */
export const SCHEMA_HEAL_KEY = 'ddo-db-schema-heal-attempted'

/** Cache mode for the DB fetch. The DB sits behind TWO cache layers: the
 *  service worker's Cache Storage (cleared by the self-heal) and the
 *  browser's HTTP cache (NOT cleared by it — GitHub Pages serves static
 *  assets with a finite max-age). When the heal guard is set we're on the
 *  one post-heal reload, so bypass the HTTP cache too; otherwise the same
 *  stale bytes can come back and burn the single heal attempt. A query-param
 *  cache-buster would be wrong here: sw.js matches the DB by URL suffix, so
 *  changing the URL silently disables service-worker caching. Exported for
 *  tests. */
export function dbFetchCacheMode(): RequestCache {
  if (typeof sessionStorage === 'undefined') return 'default'
  return sessionStorage.getItem(SCHEMA_HEAL_KEY) === null ? 'default' : 'reload'
}

// Tagged kinds for categorizing DB load failures. Consumers (DatabaseGate)
// switch on `err.kind` to render category-specific UI without parsing
// free-form message strings.
export const DB_ERROR_FETCH = 'db-fetch' as const // server responded with non-OK status
export const DB_ERROR_NETWORK = 'db-network' as const // couldn't reach server
export const DB_ERROR_TIMEOUT = 'db-timeout' as const // request exceeded timeout
export const DB_ERROR_WASM = 'db-wasm' as const // WebAssembly init failed
export const DB_ERROR_SCHEMA = 'db-schema' as const // DB loaded but schema invalid

export type DbErrorKind =
  | typeof DB_ERROR_FETCH
  | typeof DB_ERROR_NETWORK
  | typeof DB_ERROR_TIMEOUT
  | typeof DB_ERROR_WASM
  | typeof DB_ERROR_SCHEMA

export class DbError extends Error {
  readonly kind: DbErrorKind
  constructor(kind: DbErrorKind, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DbError'
    this.kind = kind
  }
}

export function isDbError(err: unknown): err is DbError {
  return err instanceof DbError
}

// Schema features the frontend queries that were ADDED after the first
// public DB shipped. The service worker serves ddo.db cache-first, so after
// a deploy that changes the schema, returning browsers run new code against
// the old cached DB for at least one page load — a sw.js CACHE_NAME bump
// cannot close that window (the old worker serves the load that discovers
// the new one). Validating these at the gate turns that stale-cache state
// into a DB_ERROR_SCHEMA, which DatabaseGate self-heals by clearing caches;
// without it, the mismatch crashes later inside whichever view queries the
// missing column ("no such column: loot_type" — 2026-07-25 incident).
//
// Add a [table, column] pair here whenever a frontend query starts relying
// on a new column or table. Enforced by schemaCompat.test.ts: every query
// function is run against the frozen v1 baseline schema, and any missing
// column it trips over must be listed here — forgetting an entry fails CI
// instead of crashing returning browsers.
export const REQUIRED_COLUMNS: ReadonlyArray<readonly [table: string, column: string]> = [
  ['quest_loot', 'loot_type'],
  // getItemDetail reads is_rare to mark rare drops in "Drops from".
  ['quest_loot', 'is_rare'],
]

/** Smoke-test the loaded DB to catch corrupt, empty, stale-cached, or
 *  wrong-version files before the app renders with silent bad data. Checks
 *  a known table has at least one row and that every schema feature the
 *  frontend queries exists. Exported for tests. */
export function validateSchema(db: Database): void {
  let count: number | undefined
  try {
    const result = db.exec('SELECT COUNT(*) FROM items')
    count = result[0]?.values[0]?.[0] as number
  } catch (err) {
    throw new DbError(
      DB_ERROR_SCHEMA,
      'Game database has an invalid schema — it may be corrupt or from an incompatible version',
      { cause: err },
    )
  }
  if (count === 0) {
    throw new DbError(DB_ERROR_SCHEMA, 'Game database is empty (0 items)')
  }

  for (const [table, column] of REQUIRED_COLUMNS) {
    // pragma_table_info returns zero rows for a missing table, so this one
    // check covers both "table gone" and "column not yet migrated in".
    const result = db.exec(
      `SELECT COUNT(*) FROM pragma_table_info('${table}') WHERE name = '${column}'`,
    )
    const present = Number(result[0]?.values[0]?.[0] ?? 0)
    if (present === 0) {
      throw new DbError(
        DB_ERROR_SCHEMA,
        `Game database is missing ${table}.${column} — likely a stale cached copy from before a data update`,
      )
    }
  }
}

async function loadDb(controller: AbortController): Promise<Database> {
  let SQL
  try {
    SQL = await initSqlJs({ locateFile: () => sqlWasm })
  } catch (err) {
    throw new DbError(
      DB_ERROR_WASM,
      'Browser WebAssembly support failed to initialize',
      { cause: err },
    )
  }

  let buffer: ArrayBuffer
  try {
    const r = await fetch(DB_URL, { signal: controller.signal, cache: dbFetchCacheMode() })
    if (!r.ok) {
      throw new DbError(
        DB_ERROR_FETCH,
        `Failed to fetch DB: ${r.status} ${r.statusText}`,
      )
    }
    buffer = await r.arrayBuffer()
  } catch (err) {
    if (err instanceof DbError) throw err
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new DbError(
        DB_ERROR_TIMEOUT,
        `DB fetch timed out after ${DB_FETCH_TIMEOUT_MS / 1000}s — check your connection`,
      )
    }
    throw new DbError(
      DB_ERROR_NETWORK,
      err instanceof Error ? err.message : 'Network error',
      { cause: err },
    )
  }

  const db = new SQL.Database(new Uint8Array(buffer))
  try {
    validateSchema(db)
  } catch (err) {
    // Free the ~11MB WASM allocation — a rejected DB is never handed to a
    // consumer, so nothing else holds a handle to close it.
    db.close()
    throw err
  }
  return db
}

interface DatabaseState {
  db: Database | null
  loading: boolean
  error: Error | null
}

// Module-level store. The previous implementation used `useState +
// useEffect` per consumer, which meant *every* component calling
// `useDatabase` went through one render cycle with `db: null` before the
// effect synced to the singleton — even when the singleton had long since
// resolved. That manifested as DB-derived flashes on view mount
// (breadcrumb showing "items #123" before the name resolved, "no item
// found" briefly rendering before the row arrived).
//
// `useSyncExternalStore` against this module-level state fixes that: every
// consumer reads the *current* state synchronously on first render. If the
// DB is already loaded when a component mounts, the consumer immediately
// gets the populated state — no lag, no flash.
let _state: DatabaseState = { db: null, loading: true, error: null }
const _listeners = new Set<() => void>()

function notify(): void {
  _listeners.forEach((fn) => fn())
}

function setState(next: DatabaseState): void {
  _state = next
  notify()
}

// Kick off the DB load once on first useDatabase call. Idempotent: repeated
// calls skip the fetch and just subscribe to the existing module state.
// Retry-on-failure goes through DatabaseGate's full-page reload, which
// destroys the JS context, so an in-session reset isn't needed.
let _kicked = false
function ensureLoad(): void {
  if (_kicked) return
  _kicked = true

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), DB_FETCH_TIMEOUT_MS)
  loadDb(controller)
    .finally(() => clearTimeout(timeout))
    .then((db) => setState({ db, loading: false, error: null }))
    .catch((err) => {
      setState({
        db: null,
        loading: false,
        error: err instanceof Error ? err : new Error(String(err)),
      })
    })
}

function subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

function getSnapshot(): DatabaseState {
  return _state
}

export function useDatabase(): DatabaseState {
  // First consumer triggers the load; subsequent consumers piggyback on the
  // same module state. `useSyncExternalStore` makes the subscription render-
  // synchronous, so first-render reads see whatever state the module has at
  // mount time — no useState→useEffect catch-up window.
  ensureLoad()
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
