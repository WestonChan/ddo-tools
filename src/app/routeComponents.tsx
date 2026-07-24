import type { JSX } from 'react'
import { Link } from '@tanstack/react-router'
import { DatabaseGate, ErrorScreen } from '../components'
import { ResourcesView as RawResourcesView } from '../features/resources'
import { sanitizeUrl, buildIssueUrls } from '../lib/githubIssue'

function Placeholder({ message }: { message: string }): JSX.Element {
  return <div className="section-placeholder">{message}</div>
}

const makePlaceholder =
  (message: string) =>
  (): JSX.Element =>
    <Placeholder message={message} />

const RawBuildPlanView = makePlaceholder('Build Plan coming in Phase 5.')
const RawOverviewView = makePlaceholder('Build Overview coming in Phase 10.')
const RawGearView = makePlaceholder('Gear Planner coming in Phase 6.')
const RawDamageCalcView = makePlaceholder('Damage Calculator coming in a future update.')
const RawFarmChecklistView = makePlaceholder('Farm Checklist coming in Phase 8.')

// Wrap each DB-needing placeholder in DatabaseGate so the loading-skeleton
// + error-categorization UX is in place from day one. Settings, Characters,
// and Landing skip the gate (they don't need the game DB).
function gated(View: () => JSX.Element): () => JSX.Element {
  return function GatedView(): JSX.Element {
    return (
      <DatabaseGate>
        <View />
      </DatabaseGate>
    )
  }
}

export const BuildPlanView = gated(RawBuildPlanView)
export const OverviewView = gated(RawOverviewView)
export const GearView = gated(RawGearView)
export const DamageCalcView = gated(RawDamageCalcView)
export const FarmChecklistView = gated(RawFarmChecklistView)
export const ResourcesView = gated(RawResourcesView)

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
