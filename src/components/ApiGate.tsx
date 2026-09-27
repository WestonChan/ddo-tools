import type { JSX, ReactNode } from 'react'
import { describeApiError } from '../lib/api'
import { ErrorScreen } from './ErrorScreen'
import './ApiGate.css'

interface ApiGateProps {
  isPending: boolean
  error: unknown
  onRetry: () => void
  children: ReactNode
}

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
