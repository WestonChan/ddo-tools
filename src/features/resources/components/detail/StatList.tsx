import type { JSX, ReactNode } from 'react'

export interface LabeledStat {
  label: string
  value: ReactNode
}

interface StatListProps {
  stats: LabeledStat[]
}

export function StatList({ stats }: StatListProps): JSX.Element {
  return (
    <ul className="resources-stat-list">
      {stats.map(({ label, value }, i) => (
        <li key={`${label}-${i}`} className="resources-stat-row">
          <span className="resources-stat-label">{label}</span>
          <span className="resources-stat-value">{value}</span>
        </li>
      ))}
    </ul>
  )
}
