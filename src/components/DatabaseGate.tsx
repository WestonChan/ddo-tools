import { useEffect, type JSX, type ReactNode } from 'react'
import { useDatabase } from '../hooks'
import { ErrorScreen } from './ErrorScreen'
import { categorizeDbError } from './dbErrorCategorize'
import './DatabaseGate.css'

const RETRY_KEY = 'ddo-db-retry-count'
const RETRY_LIMIT = 3

/** Per-view DB-loading wrapper. Replaces the deprecated top-level
 *  `LoadingGate` so views that don't need `ddo.db` (Settings, Characters,
 *  Landing) render instantly.
 *
 *  - `loading` → skeleton
 *  - `error` → categorized `<ErrorScreen>` with Retry + Clear-Cached buttons
 *  - `success` → children
 *
 *  Retry counter persists in `sessionStorage`. After 3 fails the Retry
 *  button disables and copy escalates to "try clearing cache." On
 *  successful load the counter clears so a user who hit the limit then
 *  came back to a recovered DB doesn't see Retry stuck disabled. */
export function DatabaseGate({ children }: { children: ReactNode }): JSX.Element {
  const { db, loading, error } = useDatabase()

  useEffect(() => {
    if (db) sessionStorage.removeItem(RETRY_KEY)
  }, [db])

  if (loading) return <DatabaseGateSkeleton />
  if (error) return <DatabaseGateError error={error} />
  return <>{children}</>
}

function DatabaseGateSkeleton(): JSX.Element {
  return (
    <div className="database-gate-skeleton" role="status" aria-label="Loading database">
      <div className="skeleton-block skeleton-heading" />
      <div className="skeleton-block skeleton-line" />
      <div className="skeleton-block skeleton-line short" />
      <div className="skeleton-block skeleton-line" />
    </div>
  )
}

function DatabaseGateError({ error }: { error: Error }): JSX.Element {
  const { heading, hint } = categorizeDbError(error)
  const exhaustedRetries = readRetryCount() >= RETRY_LIMIT

  const hintNode = exhaustedRetries ? (
    <span id="db-retry-escalation">
      Retrying didn&rsquo;t help &mdash; try clearing the cached game data below.
    </span>
  ) : (
    hint
  )

  return (
    <ErrorScreen
      heading={heading}
      error={error}
      hint={hintNode}
      labels="db-loading"
      actions={
        <>
          <button
            type="button"
            className="btn-primary"
            onClick={handleRetry}
            disabled={exhaustedRetries}
            aria-describedby={exhaustedRetries ? 'db-retry-escalation' : undefined}
          >
            Retry
          </button>
          <button type="button" className="btn-ghost" onClick={clearSiteData}>
            Clear Cached Game Data &amp; Retry
          </button>
        </>
      }
    />
  )
}

function readRetryCount(): number {
  if (typeof sessionStorage === 'undefined') return 0
  const raw = sessionStorage.getItem(RETRY_KEY)
  if (!raw) return 0
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function handleRetry(): void {
  sessionStorage.setItem(RETRY_KEY, String(readRetryCount() + 1))
  window.location.reload()
}

// Wipe SW caches (covers corrupt ddo.db) + unregister SWs, then reload.
function clearSiteData(): void {
  if ('caches' in window) {
    void caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
  }
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => regs.forEach((r) => r.unregister()))
  }
  sessionStorage.removeItem(RETRY_KEY)
  window.location.reload()
}

