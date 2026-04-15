import { useEffect, useState } from 'react'
import initSqlJs from 'sql.js'
import type { Database } from 'sql.js'
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url'

const DB_URL = import.meta.env.BASE_URL + 'data/ddo.db'
const DB_FETCH_TIMEOUT_MS = 60_000

// Smoke-test the loaded DB to catch corrupt, empty, or wrong-version files
// before the app renders with silent bad data. Checks a known table exists
// and has at least one row.
function validateSchema(db: Database) {
  try {
    const result = db.exec('SELECT COUNT(*) FROM items')
    const count = result[0]?.values[0]?.[0] as number
    if (count === 0) throw new Error('Game database is empty (0 items)')
  } catch (err) {
    if (err instanceof Error && err.message.includes('0 items')) throw err
    throw new Error(
      'Game database has an invalid schema — it may be corrupt or from an incompatible version',
    )
  }
}

// Singleton promise — DB is fetched and initialized only once per successful
// load. On failure, the singleton is reset so in-session retries (e.g., a
// future retry UI that doesn't full-reload the page) can re-attempt.
let _dbPromise: Promise<Database> | null = null

function getDb(): Promise<Database> {
  if (!_dbPromise) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DB_FETCH_TIMEOUT_MS)
    _dbPromise = initSqlJs({ locateFile: () => sqlWasm })
      .then((SQL) =>
        fetch(DB_URL, { signal: controller.signal })
          .then((r) => {
            if (!r.ok) throw new Error(`Failed to fetch DB: ${r.status} ${r.statusText}`)
            return r.arrayBuffer()
          })
          .then((buf) => {
            const db = new SQL.Database(new Uint8Array(buf))
            validateSchema(db)
            return db
          }),
      )
      .finally(() => clearTimeout(timeout))
      .catch((err) => {
        // Reset singleton so future callers can retry instead of re-receiving
        // the cached rejection forever.
        _dbPromise = null
        throw err instanceof DOMException && err.name === 'AbortError'
          ? new Error(`DB fetch timed out after ${DB_FETCH_TIMEOUT_MS / 1000}s — check your connection`)
          : err
      })
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
