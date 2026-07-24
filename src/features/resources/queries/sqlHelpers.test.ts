import { describe, it, expect, vi } from 'vitest'
import type { Database, QueryExecResult, Statement } from 'sql.js'
import { rowsToObjects, firstRow, escapeLike, runQuery, runQueryFirst } from './sqlHelpers'

describe('rowsToObjects', () => {
  it('maps columns/values to typed objects', () => {
    const result: QueryExecResult = {
      columns: ['id', 'name', 'level'],
      values: [
        [1, 'Sword', 5],
        [2, 'Shield', 3],
      ],
    }
    interface Row {
      id: number
      name: string
      level: number
    }
    expect(rowsToObjects<Row>(result)).toEqual([
      { id: 1, name: 'Sword', level: 5 },
      { id: 2, name: 'Shield', level: 3 },
    ])
  })

  it('returns [] for undefined', () => {
    expect(rowsToObjects(undefined)).toEqual([])
  })

  it('handles empty values', () => {
    const result: QueryExecResult = { columns: ['x'], values: [] }
    expect(rowsToObjects(result)).toEqual([])
  })
})

describe('firstRow', () => {
  it('returns the first object row', () => {
    const result: QueryExecResult = {
      columns: ['id', 'name'],
      values: [[1, 'A'], [2, 'B']],
    }
    expect(firstRow<{ id: number; name: string }>(result)).toEqual({ id: 1, name: 'A' })
  })

  it('returns null when no rows', () => {
    expect(firstRow({ columns: ['x'], values: [] })).toBeNull()
    expect(firstRow(undefined)).toBeNull()
  })
})

describe('escapeLike', () => {
  it('escapes `%`, `_`, and `\\` so LIKE matches them literally', () => {
    expect(escapeLike('100%')).toBe('100\\%')
    expect(escapeLike('a_b')).toBe('a\\_b')
    expect(escapeLike('a\\b')).toBe('a\\\\b')
    expect(escapeLike('50%_off\\sale')).toBe('50\\%\\_off\\\\sale')
  })

  it('passes through plain text unchanged', () => {
    expect(escapeLike('Greatsword of Force')).toBe('Greatsword of Force')
    expect(escapeLike('')).toBe('')
  })
})

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
