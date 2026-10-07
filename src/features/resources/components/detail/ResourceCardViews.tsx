import type { JSX } from 'react'
import { DetailValueRow } from '../../../../components'

export function DamageView({ entries }: { entries: readonly string[] }): JSX.Element {
  return (
    <>
      {entries.map((damage, index) => (
        <DetailValueRow
          key={`${damage}-${index}`}
          label="Damage"
          value={damage}
          tone="damage"
          className="hover-card-row"
        />
      ))}
    </>
  )
}

export function DescriptionView({ entries }: { entries: readonly string[] }): JSX.Element {
  return (
    <>
      {entries.map((description, index) => (
        <p key={index} className="resources-hover-definition">
          {description}
        </p>
      ))}
    </>
  )
}
