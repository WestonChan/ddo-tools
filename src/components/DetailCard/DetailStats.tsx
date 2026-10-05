import type { JSX } from 'react'
import './DetailCard.css'

export interface DetailStat {
  label: string
  displayLabel?: string
  value: string | number
  isNumeric: boolean
  isFullWidth?: boolean
}

export function DetailFactGrid({ stats }: { stats: DetailStat[] }): JSX.Element | null {
  if (stats.length === 0) return null

  return (
    <div className="detail-fact-grid">
      {stats.map((stat, index) => (
        <div className="detail-fact-grid__cell" key={`${stat.label}-${index}`}>
          <span className="detail-fact-grid__label">{stat.label}</span>
          <span className={`detail-fact-grid__value${stat.isNumeric ? ' num' : ''}`}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DetailExtras({ stats }: { stats: DetailStat[] }): JSX.Element | null {
  if (stats.length === 0) return null

  return (
    <div className="detail-extras">
      {stats.map((stat, index) => (
        <div
          className={`detail-extras__entry${stat.isFullWidth || String(stat.value).length > 22 ? ' detail-extras__entry--wide' : ''}`}
          key={`${stat.label}-${index}`}
        >
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
