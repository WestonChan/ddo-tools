import type { JSX } from 'react'
import { ampersandMarkSvg } from './ampersandMarkSvg'

interface AmpersandMarkProps {
  size?: number | string
  className?: string
}

/**
 * Inline brand ampersand mark. Uses currentColor for the glyph so the
 * page's `color` cascades into the fill — accent changes and theme
 * switches reach every render.
 */
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
