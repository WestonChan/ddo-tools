import type { JSX, ReactNode } from 'react'

export interface KvItem {
  label: string
  value: ReactNode
}

interface KeyValueGridProps {
  items: KvItem[]
}

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
