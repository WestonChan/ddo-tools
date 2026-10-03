import type { JSX } from 'react'
import './DetailCard.css'

export interface DetailStat {
  label: string
  value: string | number
  isNumeric: boolean
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
        <div className="detail-extras__entry" key={`${stat.label}-${index}`}>
          <span className="detail-extras__label">{stat.label}</span>
          <span className={`detail-extras__value${stat.isNumeric ? ' num' : ''}`}>
            {stat.value}
          </span>
        </div>
      ))}
    </div>
  )
}
