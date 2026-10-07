import type { JSX, ReactNode } from 'react'
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
  valueMarker,
  type,
  typePresentation = 'plain',
  tone = 'accent',
  isNumeric = true,
  className,
}: {
  label: string
  value: string | number
  valueMarker?: ReactNode
  type?: string | null
  typePresentation?: 'plain' | 'tag'
  tone?: 'accent' | 'damage'
  isNumeric?: boolean
  className?: string
}): JSX.Element {
  return (
    <div className={`detail-value-row${className ? ` ${className}` : ''}`} data-tone={tone}>
      <span className="detail-value-row__label">{label}</span>
      {type && typePresentation === 'plain' && (
        <span className="detail-value-row__type">{type}</span>
      )}
      <span className={`detail-value-row__value${isNumeric ? ' num' : ''}`}>
        {value}
        {valueMarker}
      </span>
      {type && typePresentation === 'tag' && <DetailTypeTag type={type} />}
    </div>
  )
}
