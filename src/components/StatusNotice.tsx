import type { JSX, ReactNode } from 'react'
import './StatusNotice.css'

interface StatusNoticeProps {
  heading: ReactNode
  hint: ReactNode
  actions?: ReactNode
  isCompact?: boolean
}

export function StatusNotice({
  heading,
  hint,
  actions,
  isCompact = false,
}: StatusNoticeProps): JSX.Element {
  return (
    <div className={`status-notice${isCompact ? ' status-notice--compact' : ''}`} role="status">
      <strong className="status-notice__heading">{heading}</strong>
      <span className="status-notice__hint">{hint}</span>
      {actions && <div className="status-notice__actions">{actions}</div>}
    </div>
  )
}
