import type { JSX } from 'react'
import { ampersandMarkSvg } from '../lib/ampersandMarkSvg'

interface AmpersandMarkProps {
  size?: number | string
  className?: string
}

export function AmpersandMark({ size = '1em', className }: AmpersandMarkProps): JSX.Element {
  return (
    <span
      className={className}
      style={{ display: 'inline-block', width: size, height: size, lineHeight: 0 }}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: ampersandMarkSvg({ size: '100%' }) }}
    />
  )
}
