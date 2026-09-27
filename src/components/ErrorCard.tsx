import type { JSX } from 'react'
import { buildIssueUrls } from '../lib/githubIssue'
import './ErrorCard.css'

export interface ErrorCardProps {
  error: Error | unknown
  labels?: string | string[]
  context?: string
  resetErrorBoundary?: () => void
}

export function ErrorCard({ error, labels, context }: ErrorCardProps): JSX.Element {
  const err = error instanceof Error ? error : new Error(String(error))
  const { newIssueUrl } = buildIssueUrls(err, labels, context)

  return (
    <div className="error-card" role="status" aria-live="polite">
      <span className="error-card-msg">{err.message}</span>
      <a
        className="error-card-report"
        href={newIssueUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        Report
      </a>
    </div>
  )
}
