import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bug, TriangleAlert, Check, ChevronDown } from 'lucide-react'
import {
  useCharacter,
  formatClassSummary,
  formatRace,
} from '../features/character'
import { TooltipWrapper } from '../components'
import { buildIssueUrls } from '../lib/githubIssue'
import { getLastSentryContext } from '../lib/sentry'
import './BottomBar.css'

export interface BuildWarning {
  message: string
  to: string
  severity: 'error' | 'warning' | 'info'
}

interface BottomBarProps {
  warnings: BuildWarning[]
  /** When `true`, the entire bottom bar becomes non-interactive — focus,
   *  pointer, and keyboard events are suppressed. Set by AppLayout while
   *  any modal-shape overlay (resources drawer, etc.) is active. */
  inert?: boolean
}

export function BottomBar({ warnings, inert }: BottomBarProps): JSX.Element {
  return (
    <div className="bottom-bar" inert={inert}>
      <div className="bottom-bar-row">
        <BuildInfo />
        <div className="bottom-bar-actions">
          <WarningStatus warnings={warnings} />
          <ReportBugButton />
        </div>
      </div>
    </div>
  )
}

function ReportBugButton(): JSX.Element {
  function handleClick(): void {
    // Compute the URL on click so the most-recent Sentry event ID +
    // replay correlation lands in the issue body (lastEventId() updates
    // whenever Sentry captures something, but BottomBar doesn't re-render
    // on every capture).
    const sentryContext = getLastSentryContext()
    const { newIssueUrl } = buildIssueUrls(undefined, [], 'User report', sentryContext)
    window.open(newIssueUrl, '_blank', 'noopener,noreferrer')
  }
  return (
    <TooltipWrapper text="Report a bug">
      <button
        type="button"
        className="bottom-bar-btn hoverable bottom-bar-report"
        onClick={handleClick}
        aria-label="Report a bug — opens GitHub issue"
      >
        <Bug size={14} />
      </button>
    </TooltipWrapper>
  )
}

function BuildInfo(): JSX.Element {
  const { character, activeBuild } = useCharacter()

  const buildDescription = activeBuild
    ? `${formatRace(activeBuild.race)} ${formatClassSummary(activeBuild)}`
    : ''

  return (
    <div className="bottom-bar-build">
      <span className="bottom-bar-name">{character.name}</span>
      {buildDescription && (
        <span className="bottom-bar-description">{buildDescription}</span>
      )}
    </div>
  )
}

function WarningStatus({ warnings }: { warnings: BuildWarning[] }): JSX.Element {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipFading, setTooltipFading] = useState(false)
  const tooltipTimer = useRef<number | null>(null)

  // Clear any pending tooltip timers on unmount so state setters don't fire
  // after the component is gone.
  useEffect(
    () => () => {
      if (tooltipTimer.current !== null) clearTimeout(tooltipTimer.current)
    },
    [],
  )

  const handleClick = useCallback(() => {
    if (warnings.length > 0) {
      setExpanded(!expanded)
      return
    }
    // Reset any in-flight fade chain so rapid clicks restart the tooltip.
    if (tooltipTimer.current !== null) clearTimeout(tooltipTimer.current)
    setShowTooltip(true)
    setTooltipFading(false)
    tooltipTimer.current = window.setTimeout(() => {
      setTooltipFading(true)
      tooltipTimer.current = window.setTimeout(() => {
        setShowTooltip(false)
        setTooltipFading(false)
        tooltipTimer.current = null
      }, 200)
    }, 1800)
  }, [warnings.length, expanded])

  return (
    <div className="bottom-bar-status">
      {warnings.length > 0 ? (
        <button className="bottom-bar-btn hoverable bottom-bar-warnings" onClick={handleClick}>
          <TriangleAlert size={14} />
          <span>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
          <ChevronDown size={12} />
        </button>
      ) : (
        <button className="bottom-bar-btn hoverable bottom-bar-ok" onClick={handleClick}>
          <Check size={14} />
          <span>No warnings</span>
        </button>
      )}

      {showTooltip && (
        <div className={`bottom-bar-tooltip${tooltipFading ? ' fading' : ''}`}>Build validation coming soon</div>
      )}

      {expanded && warnings.length > 0 && (
        <div className="bottom-bar-warning-list">
          {warnings.map((w, i) => (
            <button
              key={i}
              className={`bottom-bar-warning-item bottom-bar-warning-item--${w.severity} hoverable`}
              onClick={() => navigate({ to: w.to })}
            >
              {w.message}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
