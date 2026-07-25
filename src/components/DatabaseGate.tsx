import { useEffect, useState, type JSX, type ReactNode } from 'react'
import { useDatabase, isDbError, DB_ERROR_SCHEMA, SCHEMA_HEAL_KEY } from '../hooks'
import { ErrorScreen } from './ErrorScreen'
import { categorizeDbError } from './dbErrorCategorize'
import { clearSiteData } from './clearSiteData'
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
  // Sticky for the component's lifetime: once a heal starts, every
  // subsequent render keeps showing the skeleton until location.reload()
  // tears the page down. Recomputing from sessionStorage each render would
  // flip to "not healing" one render after the effect writes the guard,
  // flashing the error screen mid-heal.
  const [healStarted, setHealStarted] = useState(false)

  useEffect(() => {
    if (db && storageAvailable()) {
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
  // Strictly once per session (sessionStorage guard): if the error persists
  // after a clean refetch, the DB on the server is genuinely bad, and
  // looping would re-download 11MB per lap. Then the error screen takes over.
  const healing = healStarted || shouldSelfHeal(error)
  useEffect(() => {
    if (!healing || healStarted) return
    // This setState fires at most once per mount (guarded above) and the
    // page reloads moments later — the single extra render is the point:
    // it pins `healing` true so re-renders during the heal can't flash the
    // error screen. No cascading-render risk.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHealStarted(true)
    sessionStorage.setItem(SCHEMA_HEAL_KEY, '1')
    void clearSiteData()
  }, [healing, healStarted])

  if (loading) return <DatabaseGateSkeleton />
  // While the self-heal reload is in flight, hold the skeleton — flashing
  // the error screen for the sub-second before location.reload() lands
  // would look like a crash-and-recover to the user.
  if (healing) return <DatabaseGateSkeleton />
  if (error) return <DatabaseGateError error={error} />
  return <>{children}</>
}

// Storage access can throw in privacy-hardened contexts; render-phase reads
// must not take the whole view down (mirrors readRetryCount's guard).
function storageAvailable(): boolean {
  return typeof sessionStorage !== 'undefined'
}

function shouldSelfHeal(error: Error | null): boolean {
  return (
    error !== null &&
    isDbError(error) &&
    error.kind === DB_ERROR_SCHEMA &&
    storageAvailable() &&
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

