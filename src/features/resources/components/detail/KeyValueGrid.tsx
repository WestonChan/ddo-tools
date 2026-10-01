import type { JSX, ReactNode } from 'react'

export interface KeyValuePair {
  label: string
  value: ReactNode
  isNumeric?: boolean
}

interface KeyValueGridProps {
  pairs: KeyValuePair[]
}

export function KeyValueGrid({ pairs }: KeyValueGridProps): JSX.Element {
  return (
    <dl className="resources-kv-grid">
      {pairs.map(({ label, value, isNumeric }, i) => (
        <div key={`${label}-${i}`} className="resources-kv-row">
          <dt className="resources-kv-label">{label}</dt>
          <dd className={`resources-kv-value${isNumeric ? ' num' : ''}`}>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
