import type { JSX, ReactNode } from 'react'

export interface KeyValuePair {
  label: string
  value: ReactNode
}

interface KeyValueGridProps {
  pairs: KeyValuePair[]
}

export function KeyValueGrid({ pairs }: KeyValueGridProps): JSX.Element {
  return (
    <dl className="resources-kv-grid">
      {pairs.map(({ label, value }, i) => (
        <div key={`${label}-${i}`} className="resources-kv-row">
          <dt className="resources-kv-label">{label}</dt>
          <dd className="resources-kv-value">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
