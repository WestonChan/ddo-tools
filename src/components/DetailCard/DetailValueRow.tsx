import type { JSX } from 'react'
import './DetailCard.css'

export function DetailTypeTag({ type }: { type: string }): JSX.Element {
  return (
    <span className="detail-type-tag" data-type={type.toLowerCase()}>
      {type}
    </span>
  )
}

export function DetailValueRow({
  label,
  value,
  tag,
  tone = 'accent',
}: {
  label: string
  value: string | number
  tag?: string | null
  tone?: 'accent' | 'damage'
}): JSX.Element {
  return (
    <div className="detail-value-row" data-tone={tone}>
      <span className="detail-value-row__label">{label}</span>
      <span className="detail-value-row__value num">{value}</span>
      {tag && <DetailTypeTag type={tag} />}
    </div>
  )
}
