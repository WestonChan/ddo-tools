import type { Database, Statement, BindParams } from 'sql.js'

// Run a parameterized query and free the prepared statement. sql.js allocates
// statements on the WASM heap; missing a `.free()` leaks until the Database is
// destroyed. The try/finally is the entire point of this helper.
//
// The unsafe cast on `getAsObject()` is intentional — query authors are
// responsible for keeping SELECT column lists aligned with their row types.
export function runQuery<T>(
  db: Database,
  sql: string,
  params: BindParams = [],
): T[] {
  let stmt: Statement | null = null
  try {
    stmt = db.prepare(sql, params)
    const out: T[] = []
    while (stmt.step()) {
      out.push(stmt.getAsObject() as unknown as T)
    }
    return out
  } finally {
    stmt?.free()
  }
}

export function runQueryFirst<T>(
  db: Database,
  sql: string,
  params: BindParams = [],
): T | null {
  const rows = runQuery<T>(db, sql, params)
  return rows[0] ?? null
}
