import { useDatabase } from '../hooks'
import './LoadingGate.css'

export function LoadingGate({ children }: { children: React.ReactNode }) {
  const { loading, error } = useDatabase()

  if (error) {
    const msg = error.message
    const isNetworkError =
      msg.startsWith('Failed to fetch DB') || msg.includes('timed out') || msg.includes('NetworkError')
    const hint = isNetworkError
      ? 'Check your connection and try again. If the problem persists, GitHub Pages may be temporarily unavailable.'
      : 'The DDO Build Planner requires WebAssembly support. Make sure your browser is up to date.'
    return (
      <div className="loading-gate-error">
        <h1>Failed to load game database</h1>
        <p className="loading-gate-error-detail">{msg}</p>
        <p className="loading-gate-error-hint">{hint}</p>
        <button className="loading-gate-retry" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="loading-gate-skeleton">
        <div className="skeleton-nav-bar">
          <div className="skeleton-block skeleton-brand" />
          <div className="skeleton-block skeleton-nav" />
          <div className="skeleton-block skeleton-nav" />
          <div className="skeleton-block skeleton-nav" />
          <div className="skeleton-block skeleton-nav" />
        </div>
        <div className="skeleton-content">
          <div className="skeleton-block skeleton-heading" />
          <div className="skeleton-block skeleton-line" />
          <div className="skeleton-block skeleton-line short" />
          <div className="skeleton-block skeleton-line" />
        </div>
        <div className="skeleton-panel">
          <div className="skeleton-block skeleton-heading" />
          <div className="skeleton-block skeleton-line" />
          <div className="skeleton-block skeleton-line short" />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
