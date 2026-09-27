import type { JSX, ReactNode } from 'react'
import { describeApiError } from '../lib/api'
import { ErrorScreen } from './ErrorScreen'
import './ApiGate.css'

interface ApiGateProps {
  /** True while the first load is in flight. */
  isPending: boolean
  /** The load failure, if any. */
  error: unknown
  /** Re-run the load. */
  onRetry: () => void
  children: ReactNode
}

/**
 * Loading / error / content switch for a view that depends on one API query.
 *
 * - pending → skeleton
 * - error → categorized `<ErrorScreen>` with a Retry button
 * - otherwise → children
 *
 * Game data is immutable per deployment and every response is cacheable, so a
 * failure here is almost always the network or the API waking from suspend;
 * retrying is the right first move and the copy says so.
 */
export function ApiGate({ isPending, error, onRetry, children }: ApiGateProps): JSX.Element {
  if (error) {
    const { heading, hint } = describeApiError(error)
    return (
      <ErrorScreen
        heading={heading}
        hint={hint ?? undefined}
        error={error}
        labels="data"
        actions={
          <button type="button" className="btn-primary" onClick={onRetry}>
            Retry
          </button>
        }
      />
    )
  }
  if (isPending) {
    return (
      <div className="api-gate-skeleton" role="status" aria-live="polite" aria-label="Loading game data">
        <div className="api-gate-bar" />
        <div className="api-gate-bar api-gate-bar--short" />
        <div className="api-gate-bar" />
      </div>
    )
  }
  return <>{children}</>
}
