import { describe, it, expect, vi } from 'vitest'
import type { Database, Statement } from 'sql.js'
import { runQuery, runQueryFirst } from './sqlHelpers'

// `rowsToObjects`, `firstRow`, and `escapeLike` were deleted along with their
// tests: nothing outside this test file ever called them. `runQuery` builds
// rows via `stmt.getAsObject()` directly, and no query uses a LIKE clause
// (search is client-side Fuse), so `escapeLike` had no caller either.

describe('runQuery (statement lifecycle)', () => {
  it('frees the prepared statement after iteration', () => {
    const free = vi.fn()
    const stepResults = [true, true, false]
    const stmt: Statement = {
      step: vi.fn(() => stepResults.shift() ?? false),
      getAsObject: vi.fn(() => ({ id: 42 })),
      free,
    } as unknown as Statement

    const db = {
      prepare: vi.fn(() => stmt),
    } as unknown as Database

    const rows = runQuery<{ id: number }>(db, 'SELECT id FROM x WHERE n=?', [1])
    expect(rows).toEqual([{ id: 42 }, { id: 42 }])
    expect(free).toHaveBeenCalledTimes(1)
  })

  it('frees the prepared statement even when step throws', () => {
    const free = vi.fn()
    const stmt: Statement = {
      step: vi.fn(() => {
        throw new Error('boom')
      }),
      getAsObject: vi.fn(),
      free,
    } as unknown as Statement
    const db = {
      prepare: vi.fn(() => stmt),
    } as unknown as Database

    expect(() => runQuery(db, 'SELECT 1', [])).toThrow('boom')
    expect(free).toHaveBeenCalledTimes(1)
  })
})

describe('runQueryFirst', () => {
  it('returns the first row or null', () => {
    const stmt: Statement = {
      step: vi.fn().mockReturnValueOnce(true).mockReturnValueOnce(false),
      getAsObject: vi.fn(() => ({ id: 1 })),
      free: vi.fn(),
    } as unknown as Statement
    const db = {
      prepare: vi.fn(() => stmt),
    } as unknown as Database
    expect(runQueryFirst<{ id: number }>(db, 'SELECT id FROM x', [])).toEqual({ id: 1 })

    const emptyStmt: Statement = {
      step: vi.fn().mockReturnValue(false),
      getAsObject: vi.fn(),
      free: vi.fn(),
    } as unknown as Statement
    const emptyDb = {
      prepare: vi.fn(() => emptyStmt),
    } as unknown as Database
    expect(runQueryFirst(emptyDb, 'SELECT id FROM x', [])).toBeNull()
  })
})
