import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { ErrorScreen } from '../components'
import { ResourcesView } from '../features/resources'
import { sanitizeUrl, buildIssueUrls } from '../lib/githubIssue'

function Placeholder({ message }: { message: string }): JSX.Element {
  return <div className="section-placeholder">{message}</div>
}

const makePlaceholder =
  (message: string) =>
  (): JSX.Element =>
    <Placeholder message={message} />

// Views fetch their own game data through TanStack Query and gate on it
// locally (see `<ApiGate>`), so nothing wraps them here.
export const BuildPlanView = makePlaceholder('Build Plan coming in Phase 5.')
export const OverviewView = makePlaceholder('Build Overview coming in Phase 10.')
export const GearView = makePlaceholder('Gear Planner coming in Phase 6.')
export const DamageCalcView = makePlaceholder('Damage Calculator coming in a future update.')
export const FarmChecklistView = makePlaceholder('Farm Checklist coming in Phase 8.')
export { ResourcesView }

export function NotFoundView(): JSX.Element {
  // Strip query/hash before display + before forwarding to the GitHub issue
  // body — Phase 5+ will introduce share-link payloads that may contain
  // tokens, and 404s on those URLs shouldn't leak the params.
  const sanitized = typeof window !== 'undefined'
    ? sanitizeUrl(window.location.href).replace(window.location.origin, '')
    : '/'
  const showPath = !!sanitized && sanitized !== '/'
  const reportIssue = showPath
    ? new Error(`404 — ${sanitized}`)
    : new Error('404 — Page not found')

  return (
    <ErrorScreen
      heading="Page not found"
      tone="info"
      body={
        showPath ? (
          <p className="error-screen-detail">{sanitized}</p>
        ) : (
          <p className="error-screen-hint">We couldn&rsquo;t find that page.</p>
        )
      }
      error={reportIssue}
      labels="not-found"
      actions={
        <>
          <Link to="/" className="btn-primary">
            Go to landing
          </Link>
          <a
            className="btn-ghost"
            href={buildIssueUrls(reportIssue, 'not-found', sanitized).newIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Report broken link
          </a>
        </>
      }
    />
  )
}
