import type { JSX } from 'react'
import './WireframePlaceholder.css'

interface WireframePlaceholderProps {
  label: string
  hint?: string
  minHeightPx: number
}

export function WireframePlaceholder({
  label,
  hint,
  minHeightPx,
}: WireframePlaceholderProps): JSX.Element {
  return (
    <div className="wireframe-placeholder" style={{ minHeight: minHeightPx }}>
      <div className="wireframe-placeholder-label">{label}</div>
      {hint && <div className="wireframe-placeholder-hint">{hint}</div>}
    </div>
  )
}
