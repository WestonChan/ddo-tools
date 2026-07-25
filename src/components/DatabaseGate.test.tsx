import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DbError,
  DB_ERROR_FETCH,
  DB_ERROR_NETWORK,
  DB_ERROR_TIMEOUT,
  DB_ERROR_WASM,
  DB_ERROR_SCHEMA,
} from '../hooks'
import { DatabaseGate } from './DatabaseGate'
import { categorizeDbError } from './dbErrorCategorize'

// `vi.mock` is hoisted to top of the module, so referenced variables must
// be created via `vi.hoisted` to be available when the factory runs.
const { mockUseDatabase, mockClearSiteData } = vi.hoisted(() => ({
  mockUseDatabase: vi.fn(),
  mockClearSiteData: vi.fn(),
}))

vi.mock('../hooks', async (importActual) => {
  const actual = await importActual<typeof import('../hooks')>()
  return { ...actual, useDatabase: mockUseDatabase }
})

vi.mock('./clearSiteData', () => ({ clearSiteData: mockClearSiteData }))

beforeEach(() => {
  mockUseDatabase.mockReset()
  mockClearSiteData.mockReset()
  sessionStorage.clear()
})

afterEach(() => {
  sessionStorage.clear()
})

describe('DatabaseGate', () => {
  it('renders the loading skeleton when useDatabase is loading', () => {
    mockUseDatabase.mockReturnValue({ db: null, loading: true, error: null })
    render(
      <DatabaseGate>
        <div>view content</div>
      </DatabaseGate>,
    )
    expect(screen.getByRole('status', { name: 'Loading database' })).toBeInTheDocument()
    expect(screen.queryByText('view content')).not.toBeInTheDocument()
  })

  it('renders children once the DB is ready', () => {
    mockUseDatabase.mockReturnValue({ db: {}, loading: false, error: null })
    render(
      <DatabaseGate>
        <div>view content</div>
      </DatabaseGate>,
    )
    expect(screen.getByText('view content')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading database' })).not.toBeInTheDocument()
  })

  it('renders ErrorScreen with categorized heading on error', () => {
    mockUseDatabase.mockReturnValue({
      db: null,
      loading: false,
      error: new DbError(DB_ERROR_FETCH, 'Failed to fetch DB: 404 Not Found'),
    })
    render(
      <DatabaseGate>
        <div>view content</div>
      </DatabaseGate>,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Failed to load game database' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/mid-deploy/)).toBeInTheDocument()
  })

  it('clears the retry counter when the DB loads successfully', () => {
    sessionStorage.setItem('ddo-db-retry-count', '2')
    mockUseDatabase.mockReturnValue({ db: {}, loading: false, error: null })
    render(
      <DatabaseGate>
        <div>ok</div>
      </DatabaseGate>,
    )
    expect(sessionStorage.getItem('ddo-db-retry-count')).toBeNull()
  })

  it('disables Retry and shows escalation copy after 3 sessionStorage retries', () => {
    sessionStorage.setItem('ddo-db-retry-count', '3')
    mockUseDatabase.mockReturnValue({
      db: null,
      loading: false,
      error: new DbError(DB_ERROR_NETWORK, 'Network error'),
    })
    render(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )
    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    expect(retryBtn).toBeDisabled()
    expect(retryBtn).toHaveAttribute('aria-describedby', 'db-retry-escalation')
    const escalation = document.getElementById('db-retry-escalation')
    expect(escalation).not.toBeNull()
    expect(escalation?.textContent).toMatch(/try clearing the cache/i)
    // The Clear-Cached-Data button is still enabled — the user's escape hatch.
    expect(screen.getByRole('button', { name: /Clear Cached Game Data/ })).toBeEnabled()
  })

  it('keeps Retry enabled below 3 retries', () => {
    sessionStorage.setItem('ddo-db-retry-count', '2')
    mockUseDatabase.mockReturnValue({
      db: null,
      loading: false,
      error: new DbError(DB_ERROR_NETWORK, 'Network error'),
    })
    render(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
  })
})

// Schema errors get one automatic clear-cache-and-reload before any UI is
// shown. Rationale (stale-service-worker incident, 2026-07-25): sw.js serves
// ddo.db cache-first, so the first page load after a schema-changing deploy
// runs new code against the old cached DB. That's self-inflicted staleness —
// the fix is known (clear the cache), so don't make the user click it. The
// sessionStorage guard limits it to ONE attempt: if the schema error
// persists (server actually shipping a bad DB), the normal error screen
// shows rather than an infinite reload loop re-downloading 11MB.
describe('DatabaseGate schema self-heal', () => {
  const schemaError = (): DbError =>
    new DbError(DB_ERROR_SCHEMA, 'Game database is missing quest_loot.loot_type')

  it('auto-clears caches once on a schema error, showing the skeleton meanwhile', () => {
    mockUseDatabase.mockReturnValue({ db: null, loading: false, error: schemaError() })
    render(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )
    expect(mockClearSiteData).toHaveBeenCalledTimes(1)
    // No error flash while the heal reload is in flight.
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    expect(screen.getByRole('status', { name: 'Loading database' })).toBeInTheDocument()
  })

  it('shows the error screen instead of healing when the guard is already set', () => {
    sessionStorage.setItem('ddo-db-schema-heal-attempted', '1')
    mockUseDatabase.mockReturnValue({ db: null, loading: false, error: schemaError() })
    render(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )
    expect(mockClearSiteData).not.toHaveBeenCalled()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Game database is invalid' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clear Cached Game Data/ })).toBeEnabled()
  })

  it('does not auto-heal non-schema errors', () => {
    mockUseDatabase.mockReturnValue({
      db: null,
      loading: false,
      error: new DbError(DB_ERROR_NETWORK, 'Network error'),
    })
    render(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )
    expect(mockClearSiteData).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })

  it('clears the heal guard once the DB loads, re-arming for future deploys', () => {
    sessionStorage.setItem('ddo-db-schema-heal-attempted', '1')
    mockUseDatabase.mockReturnValue({ db: {}, loading: false, error: null })
    render(
      <DatabaseGate>
        <div>ok</div>
      </DatabaseGate>,
    )
    expect(sessionStorage.getItem('ddo-db-schema-heal-attempted')).toBeNull()
  })

  it('holds the skeleton across re-renders while the heal reload is in flight', () => {
    // clearSiteData awaits cache deletion (an 11MB entry) + SW unregister
    // before location.reload() lands — a window of hundreds of ms. The heal
    // effect sets the sessionStorage guard immediately, so a naive
    // "shouldSelfHeal(error)" recomputation flips to false on the very next
    // render and flashes the error screen mid-heal. Simulate: heal pending
    // (never-resolving clearSiteData), then force a re-render.
    mockClearSiteData.mockReturnValue(new Promise(() => {}))
    mockUseDatabase.mockReturnValue({ db: null, loading: false, error: schemaError() })
    const { rerender } = render(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )
    expect(mockClearSiteData).toHaveBeenCalledTimes(1)

    rerender(
      <DatabaseGate>
        <div>view</div>
      </DatabaseGate>,
    )

    expect(screen.getByRole('status', { name: 'Loading database' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    // Still exactly one heal attempt — the re-render must not re-trigger it.
    expect(mockClearSiteData).toHaveBeenCalledTimes(1)
  })
})

describe('categorizeDbError', () => {
  it('categorizes DB_ERROR_NETWORK', () => {
    const result = categorizeDbError(new DbError(DB_ERROR_NETWORK, 'fetch failed'))
    expect(result.heading).toBe('Failed to load game database')
    expect(result.hint).toMatch(/connection/i)
  })

  it('categorizes DB_ERROR_FETCH (server responded non-OK)', () => {
    const result = categorizeDbError(new DbError(DB_ERROR_FETCH, 'Failed to fetch DB: 404'))
    expect(result.heading).toBe('Failed to load game database')
    expect(result.hint).toMatch(/mid-deploy/i)
  })

  it('categorizes DB_ERROR_TIMEOUT', () => {
    const result = categorizeDbError(new DbError(DB_ERROR_TIMEOUT, 'Timed out'))
    expect(result.heading).toBe('Failed to load game database')
    expect(result.hint).toMatch(/timed out/i)
  })

  it('categorizes DB_ERROR_WASM', () => {
    const result = categorizeDbError(new DbError(DB_ERROR_WASM, 'WASM init failed'))
    expect(result.heading).toBe('Browser not supported')
    expect(result.hint).toMatch(/WebAssembly/i)
  })

  it('categorizes DB_ERROR_SCHEMA', () => {
    const result = categorizeDbError(new DbError(DB_ERROR_SCHEMA, 'Invalid schema'))
    expect(result.heading).toBe('Game database is invalid')
    expect(result.hint).toMatch(/corrupt/i)
  })

  it('falls back to a generic categorization for non-DbError instances', () => {
    const result = categorizeDbError(new Error('mystery'))
    expect(result.heading).toBe('Something went wrong')
    expect(result.hint).toBeNull()
  })
})
