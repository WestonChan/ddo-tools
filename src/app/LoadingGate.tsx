import type { JSX } from 'react'
import { useDatabase } from '../hooks'
import './LoadingGate.css'

const REPO_URL = 'https://github.com/WestonChan/ddo-tools'

function clearSiteData(): void {
  // Wipe SW caches (covers corrupt ddo.db), then reload
  if ('caches' in window) {
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()))
  }
  window.location.reload()
}

export function LoadingGate({ children }: { children: React.ReactNode }): JSX.Element {
  const { loading, error } = useDatabase()

  if (error) {
    const msg = error.message
    // Categorize by what actually went wrong, not just the error source.
    // "Failed to fetch DB: 404" = server responded, file missing (deployment issue).
    // "Failed to fetch" (no status) / "timed out" / "NetworkError" = connection issue.
    const isHttpError = msg.startsWith('Failed to fetch DB:')
    const isNetworkError =
      msg.includes('timed out') || msg.includes('NetworkError') || (!isHttpError && msg.includes('Failed to fetch'))
    const isWasmError = msg.includes('WebAssembly') || msg.includes('wasm')

    let heading = 'Something went wrong'
    let hint: string | null = null
    if (isNetworkError) {
      heading = 'Failed to load game database'
      hint = 'Check your connection and try again.'
    } else if (isHttpError) {
      heading = 'Failed to load game database'
      hint = 'The game database file could not be found. The site may be mid-deploy — try again in a minute.'
    } else if (isWasmError) {
      heading = 'Browser not supported'
      hint = 'DDO Tools requires WebAssembly support. Make sure your browser is up to date.'
    }
    const issueBody = [
      `**Error:** ${msg}`,
      '',
      error.stack ? '**Stack trace:**\n```\n' + error.stack + '\n```' : '',
      `**Browser:** ${navigator.userAgent}`,
      `**URL:** ${window.location.href}`,
    ].filter(Boolean).join('\n\n')
    // Search existing issues first so duplicates get +1'd instead of re-filed.
    // GitHub's search results page has a "New issue" button if no match exists.
    const searchTerms = msg.split(/[—:]/, 1)[0].trim() // first phrase before punctuation
    const searchUrl = `${REPO_URL}/issues?q=is%3Aopen+label%3Aloading-error`
    const newIssueUrl = `${REPO_URL}/issues/new?labels=loading-error&title=${encodeURIComponent(searchTerms)}&body=${encodeURIComponent(issueBody)}`
    return (
      <div className="loading-gate-error">
        <h1>{heading}</h1>
        <p className="loading-gate-error-detail">{msg}</p>
        {hint && <p className="loading-gate-error-hint">{hint}</p>}
        <div className="loading-gate-actions">
          <button className="loading-gate-retry" onClick={() => window.location.reload()}>
            Retry
          </button>
          <button className="loading-gate-retry loading-gate-retry--secondary" onClick={clearSiteData}>
            Clear Cached Data & Retry
          </button>
        </div>
        <p className="loading-gate-report">
          This may be a <a href={searchUrl} target="_blank" rel="noopener noreferrer">known issue</a>. If not, <a href={newIssueUrl} target="_blank" rel="noopener noreferrer">report it</a>.
        </p>
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
