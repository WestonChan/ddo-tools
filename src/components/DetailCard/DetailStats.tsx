import { useState, type JSX } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import './DetailCard.css'

export interface DetailStat {
  label: string
  displayLabel?: string
  value: string | number
  isNumeric: boolean
  hint?: string
}

export function DetailStats({
  primaryStats,
  extraStats,
  damageReductionBypasses = [],
}: {
  primaryStats: DetailStat[]
  extraStats: DetailStat[]
  damageReductionBypasses?: string[]
}): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false)
  const bypasses = damageReductionBypasses.map((bypass) => bypass.trim()).filter(Boolean)
  if (primaryStats.length === 0 && extraStats.length === 0 && bypasses.length === 0) return null

  return (
    <div className="detail-stats">
      <DetailFactGrid stats={primaryStats} />
      {bypasses.length > 0 && (
        <div className="detail-dr-bypass">
          <span className="detail-dr-bypass__label">DR bypass</span>
          <span className="detail-dr-bypass__value">{bypasses.join(', ')}</span>
        </div>
      )}
      {extraStats.length > 0 && (
        <div className="detail-stats__toggle-row">
          <button
            type="button"
            className="detail-stats__toggle"
            aria-expanded={isExpanded}
            onClick={() => setIsExpanded((wasExpanded) => !wasExpanded)}
          >
            <span className="detail-stats__toggle-label">
              <span aria-hidden={isExpanded}>More details</span>
              <span aria-hidden={!isExpanded}>Less details</span>
            </span>
            {isExpanded ? (
              <ChevronUp size={12} aria-hidden="true" />
            ) : (
              <ChevronDown size={12} aria-hidden="true" />
            )}
          </button>
        </div>
      )}
      {isExpanded && <DetailExtras stats={extraStats} />}
    </div>
  )
}

function DetailFactGrid({ stats }: { stats: DetailStat[] }): JSX.Element | null {
  if (stats.length === 0) return null

  return (
    <div className="detail-fact-grid">
      {stats.map((stat, index) => (
        <div className="detail-fact-grid__cell" key={`${stat.label}-${index}`}>
          <span className="detail-fact-grid__label">{stat.label}</span>
          <span
            className={`detail-fact-grid__value${stat.isNumeric ? ' num' : ''}`}
            title={stat.hint}
          >
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function DetailExtras({ stats }: { stats: DetailStat[] }): JSX.Element | null {
  if (stats.length === 0) return null

  return (
    <div className="detail-extras">
      {stats.map((stat, index) => (
        <div className="detail-extras__entry" key={`${stat.label}-${index}`}>
          <span
            className="detail-extras__label"
            title={stat.displayLabel && stat.displayLabel !== stat.label ? stat.label : undefined}
          >
            {stat.displayLabel ?? stat.label}
          </span>
          <span className={`detail-extras__value${stat.isNumeric ? ' num' : ''}`}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}
