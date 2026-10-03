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
  layout = 'inline',
  isNumeric = true,
  className,
}: {
  label: string
  value: string | number
  tag?: string | null
  tone?: 'accent' | 'damage'
  layout?: 'inline' | 'ledger'
  isNumeric?: boolean
  className?: string
}): JSX.Element {
  return (
    <div
      className={`detail-value-row${className ? ` ${className}` : ''}`}
      data-tone={tone}
      data-layout={layout}
    >
      <span className="detail-value-row__label">{label}</span>
      <span className={`detail-value-row__value${isNumeric ? ' num' : ''}`}>{value}</span>
      {tag && <DetailTypeTag type={tag} />}
    </div>
  )
}
