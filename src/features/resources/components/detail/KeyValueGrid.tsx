import type { JSX, ReactNode } from 'react'

export interface KvItem {
  label: string
  value: ReactNode
}

interface KeyValueGridProps {
  items: KvItem[]
}

// Compact 2-column key/value grid used by EntityHeader for the item's primary
// attributes (rarity, slot, ML, material, binding). Differs from `StatList`
// in that the columns are aligned on a grid rather than flowing free.
export function KeyValueGrid({ items }: KeyValueGridProps): JSX.Element {
  return (
    <dl className="resources-kv-grid">
      {items.map(({ label, value }, i) => (
        <div key={`${label}-${i}`} className="resources-kv-row">
          <dt className="resources-kv-label">{label}</dt>
          <dd className="resources-kv-value">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
