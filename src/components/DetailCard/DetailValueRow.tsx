import type { JSX } from 'react'
import './DetailCard.css'

function DetailTypeTag({ type }: { type: string }): JSX.Element {
  return (
    <span className="detail-type-tag" data-type={type.toLowerCase()}>
      {type}
    </span>
  )
}

export function DetailValueRow({
  label,
  value,
  type,
  typePresentation = 'plain',
  tone = 'accent',
  layout = 'inline',
  isNumeric = true,
  className,
}: {
  label: string
  value: string | number
  type?: string | null
  typePresentation?: 'plain' | 'tag'
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
      {type && typePresentation === 'plain' && (
        <span className="detail-value-row__type">{type}</span>
      )}
      <span className={`detail-value-row__value${isNumeric ? ' num' : ''}`}>{value}</span>
      {type && typePresentation === 'tag' && <DetailTypeTag type={type} />}
    </div>
  )
}
