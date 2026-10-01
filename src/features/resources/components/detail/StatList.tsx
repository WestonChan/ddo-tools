import type { JSX } from 'react'
import type { KeyValuePair } from './KeyValueGrid'

interface StatListProps {
  stats: KeyValuePair[]
}

export function StatList({ stats }: StatListProps): JSX.Element {
  return (
    <ul className="resources-stat-list">
      {stats.map(({ label, value, isNumeric }, i) => (
        <li key={`${label}-${i}`} className="resources-stat-row">
          <span className="resources-stat-label">{label}</span>
          <span className={`resources-stat-value${isNumeric ? ' num' : ''}`}>{value}</span>
        </li>
      ))}
    </ul>
  )
}
