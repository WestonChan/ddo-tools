import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Bug, TriangleAlert, Check, ChevronDown } from 'lucide-react'
import {
  useCharacters,
  classSplitLabel,
  raceLabelOf,
} from '../features/character'
import { HoverTooltip } from '../components'
import { githubIssueUrls } from '../lib/githubIssue'
import { lastSentryEventReference } from '../lib/sentry'
import './BottomBar.css'

export interface BuildWarning {
  message: string
  to: string
  severity: 'error' | 'warning' | 'info'
}

interface BottomBarProps {
  warnings: BuildWarning[]
  inert?: boolean
}

export function BottomBar({ warnings, inert }: BottomBarProps): JSX.Element {
  return (
    <div className="bottom-bar" inert={inert}>
      <div className="bottom-bar-row">
        <ActiveBuildSummary />
        <div className="bottom-bar-actions">
          <WarningStatus warnings={warnings} />
          <ReportBugButton />
        </div>
      </div>
    </div>
  )
}

function ReportBugButton(): JSX.Element {
  function openBugReportIssue(): void {
    const lastSentryEvent = lastSentryEventReference()
    const { newIssueUrl } = githubIssueUrls(undefined, [], 'User report', lastSentryEvent)
    window.open(newIssueUrl, '_blank', 'noopener,noreferrer')
  }
  return (
    <HoverTooltip text="Report a bug">
      <button
        type="button"
        className="bottom-bar-btn hoverable bottom-bar-report"
        onClick={openBugReportIssue}
        aria-label="Report a bug — opens GitHub issue"
      >
        <Bug size={14} />
      </button>
    </HoverTooltip>
  )
}

function ActiveBuildSummary(): JSX.Element {
  const { selectedCharacter, viewedBuild } = useCharacters()

  const buildDescription = viewedBuild
    ? `${raceLabelOf(viewedBuild.race)} ${classSplitLabel(viewedBuild)}`
    : ''

  return (
    <div className="bottom-bar-build">
      <span className="bottom-bar-name">{selectedCharacter.name}</span>
      {buildDescription && (
        <span className="bottom-bar-description">{buildDescription}</span>
      )}
    </div>
  )
}

function WarningStatus({ warnings }: { warnings: BuildWarning[] }): JSX.Element {
  const navigate = useNavigate()
  const [isWarningListOpen, setIsWarningListOpen] = useState(false)
  const [isTooltipVisible, setIsTooltipVisible] = useState(false)
  const [isTooltipFading, setIsTooltipFading] = useState(false)
  const tooltipTimeoutId = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (tooltipTimeoutId.current !== null) clearTimeout(tooltipTimeoutId.current)
    },
    [],
  )

  const toggleWarningList = useCallback(() => {
    setIsWarningListOpen((wasOpen) => !wasOpen)
  }, [])

  const showValidationComingSoonTooltip = useCallback(() => {
    if (tooltipTimeoutId.current !== null) clearTimeout(tooltipTimeoutId.current)
    setIsTooltipVisible(true)
    setIsTooltipFading(false)
    tooltipTimeoutId.current = window.setTimeout(() => {
      setIsTooltipFading(true)
      tooltipTimeoutId.current = window.setTimeout(() => {
        setIsTooltipVisible(false)
        setIsTooltipFading(false)
        tooltipTimeoutId.current = null
      }, 200)
    }, 1800)
  }, [])

  return (
    <div className="bottom-bar-status">
      {warnings.length > 0 ? (
        <button className="bottom-bar-btn hoverable bottom-bar-warnings" onClick={toggleWarningList}>
          <TriangleAlert size={14} />
          <span>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
          <ChevronDown size={12} />
        </button>
      ) : (
        <button className="bottom-bar-btn hoverable bottom-bar-ok" onClick={showValidationComingSoonTooltip}>
          <Check size={14} />
          <span>No warnings</span>
        </button>
      )}

      {isTooltipVisible && (
        <div className={`bottom-bar-tooltip${isTooltipFading ? ' fading' : ''}`}>Build validation coming soon</div>
      )}

      {isWarningListOpen && warnings.length > 0 && (
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
