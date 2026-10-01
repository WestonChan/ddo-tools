import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { ErrorScreen, WireframePlaceholder } from '../components'
import { BuildOverviewView, BuildPlanView } from '../features/build'
import { useActiveCharacterSummary } from '../features/character'
import { GearView } from '../features/gear'
import { LandingView } from '../features/landing'
import { ResourcesView } from '../features/resources'
import { urlWithoutQueryOrFragment, githubIssueUrls } from '../lib/githubIssue'
import './routeComponents.css'

export function DamageCalculatorView(): JSX.Element {
  return (
    <div className="page route-scaffold">
      <Link to="/overview" className="route-scaffold-back-link">
        ← Back to Build overview
      </Link>
      <WireframePlaceholder label="Ability/spell selector" minHeightPx={60} />
      <WireframePlaceholder
        label="Formula breakdown — each multiplier row, mono numbers, source links"
        minHeightPx={200}
      />
      <WireframePlaceholder
        label="Result: damage range, crit profile, DPS estimate"
        minHeightPx={80}
      />
    </div>
  )
}

export function FarmChecklistView(): JSX.Element {
  return (
    <div className="page route-scaffold">
      <WireframePlaceholder
        label="Wanted items list — acquisition path per item (Farm / Craft / Purchase)"
        minHeightPx={140}
      />
      <WireframePlaceholder
        label="Materials summary — summed across crafting paths, grouped by system"
        minHeightPx={120}
      />
      <WireframePlaceholder
        label="Quest run list — where to go, what drops there"
        minHeightPx={120}
      />
    </div>
  )
}

export { BuildOverviewView, BuildPlanView, GearView, ResourcesView }

export function LandingRoute(): JSX.Element {
  return <LandingView activeCharacterSummary={useActiveCharacterSummary()} />
}

export function NotFoundView(): JSX.Element {
  const sanitizedPath =
    typeof window !== 'undefined'
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
