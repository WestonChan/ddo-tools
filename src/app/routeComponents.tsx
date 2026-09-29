import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { ErrorScreen } from '../components'
import { ResourcesView } from '../features/resources'
import { urlWithoutQueryOrFragment, githubIssueUrls } from '../lib/githubIssue'

function Placeholder({ message }: { message: string }): JSX.Element {
  return <div className="section-placeholder">{message}</div>
}

const createPlaceholderView =
  (message: string) =>
  (): JSX.Element =>
    <Placeholder message={message} />

export const BuildPlanView = createPlaceholderView('Build Plan coming in Phase 5.')
export const OverviewView = createPlaceholderView('Build Overview coming in Phase 10.')
export const GearView = createPlaceholderView('Gear Planner coming in Phase 6.')
export const DamageCalculatorView = createPlaceholderView('Damage Calculator coming in a future update.')
export const FarmChecklistView = createPlaceholderView('Farm Checklist coming in Phase 8.')
export { ResourcesView }

export function NotFoundView(): JSX.Element {
  const sanitizedPath = typeof window !== 'undefined'
    ? urlWithoutQueryOrFragment(window.location.href).replace(window.location.origin, '')
    : '/'
  const hasNonRootPath = !!sanitizedPath && sanitizedPath !== '/'
  const notFoundError = hasNonRootPath
    ? new Error(`404 — ${sanitizedPath}`)
    : new Error('404 — Page not found')

  return (
    <ErrorScreen
      heading="Page not found"
      tone="info"
      detail={
        hasNonRootPath ? (
          <p className="error-screen-detail">{sanitizedPath}</p>
        ) : (
          <p className="error-screen-hint">We couldn&rsquo;t find that page.</p>
        )
      }
      error={notFoundError}
      issueLabels="not-found"
      actions={
        <>
          <Link to="/" className="btn-primary">
            Go to landing
          </Link>
          <a
            className="btn-ghost"
            href={githubIssueUrls(notFoundError, 'not-found', sanitizedPath).newIssueUrl}
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
