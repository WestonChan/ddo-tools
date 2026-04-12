import { useState } from 'react'
import { TriangleAlert, Check, ChevronDown } from 'lucide-react'
import type { View } from '../hooks'
import './WarningBar.css'

export interface BuildWarning {
  message: string
  view: View
  severity: 'error' | 'warning' | 'info'
}

interface WarningBarProps {
  warnings: BuildWarning[]
  onNavigate: (view: View) => void
}

export function WarningBar({ warnings, onNavigate }: WarningBarProps) {
  const [expanded, setExpanded] = useState(false)

  if (warnings.length === 0) {
    return (
      <div className="warning-bar warning-bar--ok">
        <div className="warning-bar-summary warning-bar-summary--ok">
          <Check size={14} />
          <span>No warnings</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`warning-bar${expanded ? ' expanded' : ''}`}>
      <button className="warning-bar-summary" onClick={() => setExpanded(!expanded)}>
        <TriangleAlert size={14} />
        <span>
          {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
        </span>
        <ChevronDown size={12} />
      </button>
      {expanded && (
        <div className="warning-bar-list">
          {warnings.map((w, i) => (
            <button key={i} className={`warning-item warning-item--${w.severity}`} onClick={() => onNavigate(w.view)}>
              {w.message}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
