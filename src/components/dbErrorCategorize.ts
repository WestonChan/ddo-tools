import {
  isDbError,
  DB_ERROR_FETCH,
  DB_ERROR_NETWORK,
  DB_ERROR_TIMEOUT,
  DB_ERROR_WASM,
  DB_ERROR_SCHEMA,
} from '../hooks'

export interface CategorizedDbError {
  heading: string
  hint: string | null
}

/** Map a DB-load error onto a category-specific heading + hint pair.
 *  Lives outside `DatabaseGate.tsx` so the file stays component-only
 *  (react-refresh fast-refresh requires that) while keeping the function
 *  directly testable. */
export function categorizeDbError(err: Error): CategorizedDbError {
  if (isDbError(err)) {
    switch (err.kind) {
      case DB_ERROR_NETWORK:
        return {
          heading: 'Failed to load game database',
          hint: 'Check your connection and try again.',
        }
      case DB_ERROR_FETCH:
        return {
          heading: 'Failed to load game database',
          hint: 'The game database file could not be found. The site may be mid-deploy — try again in a minute.',
        }
      case DB_ERROR_TIMEOUT:
        return {
          heading: 'Failed to load game database',
          hint: 'The download timed out. Check your connection and try again.',
        }
      case DB_ERROR_WASM:
        return {
          heading: 'Browser not supported',
          hint: 'DDO Tools requires WebAssembly support. Make sure your browser is up to date.',
        }
      case DB_ERROR_SCHEMA:
        return {
          heading: 'Game database is invalid',
          hint: 'The downloaded data may be corrupt. Try clearing your cache.',
        }
    }
  }
  return { heading: 'Something went wrong', hint: null }
}
