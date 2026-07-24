import type { JSX, ReactNode } from 'react'

export interface StatListItem {
  label: string
  value: ReactNode
}

interface StatListProps {
  items: StatListItem[]
}

// Vertical list of label/value rows. Used inside `<DetailSection>` for
// weapon/armor stat blocks. Mirrors the `.stat-row` rhythm in BuildSidePanel.
export function StatList({ items }: StatListProps): JSX.Element {
  return (
    <ul className="resources-stat-list">
      {items.map(({ label, value }, i) => (
        <li key={`${label}-${i}`} className="resources-stat-row">
          <span className="resources-stat-label">{label}</span>
          <span className="resources-stat-value">{value}</span>
        </li>
      ))}
    </ul>
  )
}
