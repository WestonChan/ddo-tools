import { useCallback, useState } from 'react'
import { TriangleAlert, Check, ChevronDown } from 'lucide-react'
import type { View } from '../hooks'
import {
  useCharacter,
  formatClassSummary,
  formatRace,
} from '../features/character'
import './BottomBar.css'

export interface BuildWarning {
  message: string
  view: View
  severity: 'error' | 'warning' | 'info'
}

interface BottomBarProps {
  warnings: BuildWarning[]
  onNavigate: (view: View) => void
}

export function BottomBar({ warnings, onNavigate }: BottomBarProps) {
  return (
    <div className="bottom-bar">
      <div className="bottom-bar-row">
        <BuildInfo onNavigate={onNavigate} />
        <WarningStatus warnings={warnings} onNavigate={onNavigate} />
      </div>
    </div>
  )
}

function BuildInfo({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { character, activeBuild } = useCharacter()

  const buildDescription = activeBuild
    ? `${formatRace(activeBuild.race)} ${formatClassSummary(activeBuild)}`
    : ''

  return (
    <button className="bottom-bar-btn bottom-bar-build" onClick={() => onNavigate('characters')}>
      <span className="bottom-bar-name">{character.name}</span>
      {buildDescription && (
        <span className="bottom-bar-description">{buildDescription}</span>
      )}
    </button>
  )
}

function WarningStatus({ warnings, onNavigate }: { warnings: BuildWarning[]; onNavigate: (view: View) => void }) {
  const [expanded, setExpanded] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [tooltipFading, setTooltipFading] = useState(false)

  const handleClick = useCallback(() => {
    if (warnings.length > 0) {
      setExpanded(!expanded)
    } else {
      setShowTooltip(true)
      setTooltipFading(false)
      setTimeout(() => {
        setTooltipFading(true)
        setTimeout(() => {
          setShowTooltip(false)
          setTooltipFading(false)
        }, 200)
      }, 1800)
    }
  }, [warnings.length, expanded])

  return (
    <div className="bottom-bar-status">
      {warnings.length > 0 ? (
        <button className="bottom-bar-btn bottom-bar-warnings" onClick={handleClick}>
          <TriangleAlert size={14} />
          <span>{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
          <ChevronDown size={12} />
        </button>
      ) : (
        <button className="bottom-bar-btn bottom-bar-ok" onClick={handleClick}>
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
            <button key={i} className={`bottom-bar-warning-item bottom-bar-warning-item--${w.severity} hoverable`} onClick={() => onNavigate(w.view)}>
              {w.message}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
