import type { Database, QueryExecResult, Statement, BindParams } from 'sql.js'

// Convert a sql.js QueryExecResult into typed object rows. The unsafe-cast at
// the call site is intentional — query authors are responsible for keeping
// SELECT column lists aligned with their TypeScript row types.
export function rowsToObjects<T>(result: QueryExecResult | undefined): T[] {
  if (!result) return []
  const { columns, values } = result
  return values.map((row) => {
    const obj: Record<string, unknown> = {}
    for (let i = 0; i < columns.length; i++) {
      obj[columns[i]] = row[i]
    }
    return obj as T
  })
}

export function firstRow<T>(result: QueryExecResult | undefined): T | null {
  const rows = rowsToObjects<T>(result)
  return rows[0] ?? null
}

// Escape `%` and `_` so user input passed into a `LIKE ? ESCAPE '\\'` clause
// matches literally. The ESCAPE char must match what's used in SQL.
const LIKE_ESCAPE_CHAR = '\\'

export function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (ch) => `${LIKE_ESCAPE_CHAR}${ch}`)
}

// Run a parameterized query and free the prepared statement. sql.js allocates
// statements on the WASM heap; missing a `.free()` leaks until the Database is
// destroyed. The try/finally is the entire point of this helper.
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
