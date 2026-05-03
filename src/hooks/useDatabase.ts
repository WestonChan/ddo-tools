import { useEffect, useState } from 'react'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'

const DB_URL = import.meta.env.BASE_URL + 'data/ddo.db'
const DB_FETCH_TIMEOUT_MS = 60_000

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

// Smoke-test the loaded DB to catch corrupt, empty, or wrong-version files
// before the app renders with silent bad data. Checks a known table exists
// and has at least one row.
function validateSchema(db: Database): void {
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
    const r = await fetch(DB_URL, { signal: controller.signal })
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
  validateSchema(db)
  return db
}

// Singleton promise — DB is fetched and initialized only once per page load.
// Retry on failure goes through DatabaseGate's full-page reload, which destroys
// the JS context, so an in-session reset isn't needed.
let _dbPromise: Promise<Database> | null = null

function getDb(): Promise<Database> {
  if (!_dbPromise) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DB_FETCH_TIMEOUT_MS)
    _dbPromise = loadDb(controller).finally(() => clearTimeout(timeout))
  }
  return _dbPromise
}

interface DatabaseState {
  db: Database | null
  loading: boolean
  error: Error | null
}

export function useDatabase(): DatabaseState {
  const [state, setState] = useState<DatabaseState>({ db: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    getDb()
      .then((db) => {
        if (!cancelled) setState({ db, loading: false, error: null })
      })
      .catch((err) => {
        if (!cancelled)
          setState({
            db: null,
            loading: false,
            error: err instanceof Error ? err : new Error(String(err)),
          })
      })

    return () => {
      cancelled = true
    }
  }, [])

  return state
}
