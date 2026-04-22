import { useCallback, useEffect, useRef, useState, type JSX } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { TriangleAlert, Check, ChevronDown } from 'lucide-react'
import {
  useCharacter,
  formatClassSummary,
  formatRace,
} from '../features/character'
import './BottomBar.css'

export interface BuildWarning {
  message: string
  to: string
  severity: 'error' | 'warning' | 'info'
}

interface BottomBarProps {
  warnings: BuildWarning[]
}

export function BottomBar({ warnings }: BottomBarProps): JSX.Element {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-row">
        <BuildInfo />
        <WarningStatus warnings={warnings} />
      </div>
    </div>
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
