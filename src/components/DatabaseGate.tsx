import { useEffect, type JSX, type ReactNode } from 'react'
import { useDatabase, isDbError, DB_ERROR_SCHEMA } from '../hooks'
import { ErrorScreen } from './ErrorScreen'
import { categorizeDbError } from './dbErrorCategorize'
import { clearSiteData } from './clearSiteData'
import './DatabaseGate.css'

const RETRY_KEY = 'ddo-db-retry-count'
const RETRY_LIMIT = 3
// One-shot guard for the automatic schema-error heal below. sessionStorage,
// not localStorage: a browser restart should get a fresh attempt.
const SCHEMA_HEAL_KEY = 'ddo-db-schema-heal-attempted'

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
    if (db) {
      sessionStorage.removeItem(RETRY_KEY)
      // Re-arm the schema self-heal for the next deploy-time schema change.
      sessionStorage.removeItem(SCHEMA_HEAL_KEY)
    }
  }, [db])

  // Automatic recovery from a stale cached DB. The service worker serves
  // ddo.db cache-first, so the first load after a schema-changing deploy
  // runs new code against the old cached file; validateSchema surfaces that
  // as DB_ERROR_SCHEMA. The cause is our own cache, the fix is known —
  // clear it and reload — so do it without making the user find the button.
  // Strictly once per session (guard above): if the error persists after a
  // clean refetch, the DB on the server is genuinely bad, and looping would
  // re-download 11MB per lap. Then the normal error screen takes over.
  const healing = shouldSelfHeal(error)
  useEffect(() => {
    if (!healing) return
    sessionStorage.setItem(SCHEMA_HEAL_KEY, '1')
    void clearSiteData()
  }, [healing])

  if (loading) return <DatabaseGateSkeleton />
  // While the self-heal reload is in flight, hold the skeleton — flashing
  // the error screen for the sub-second before location.reload() lands
  // would look like a crash-and-recover to the user.
  if (healing) return <DatabaseGateSkeleton />
  if (error) return <DatabaseGateError error={error} />
  return <>{children}</>
}

function shouldSelfHeal(error: Error | null): boolean {
  return (
    error !== null &&
    isDbError(error) &&
    error.kind === DB_ERROR_SCHEMA &&
    sessionStorage.getItem(SCHEMA_HEAL_KEY) === null
  )
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
          <button type="button" className="btn-ghost" onClick={() => void clearSiteData()}>
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

