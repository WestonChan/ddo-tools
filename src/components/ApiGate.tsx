import type { JSX, ReactNode } from 'react'
import './ApiGate.css'

interface ApiGateProps {
  isPending: boolean
  children: ReactNode
}

export function ApiGate({ isPending, children }: ApiGateProps): JSX.Element {
  if (isPending) {
    return (
      <div
        className="api-gate-skeleton"
        role="status"
        aria-live="polite"
        aria-label="Loading game data"
      >
        <div className="api-gate-bar" />
        <div className="api-gate-bar api-gate-bar--short" />
        <div className="api-gate-bar" />
      </div>
    )
  }
  return <>{children}</>
}
