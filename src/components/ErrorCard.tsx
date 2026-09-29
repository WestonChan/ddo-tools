import type { JSX } from 'react'
import { githubIssueUrls } from '../lib/githubIssue'
import './ErrorCard.css'

export interface ErrorCardProps {
  error: Error | unknown
  issueLabels?: string | string[]
  issueTitle?: string
  resetErrorBoundary?: () => void
}

export function ErrorCard({ error, issueLabels, issueTitle }: ErrorCardProps): JSX.Element {
  const coercedError = error instanceof Error ? error : new Error(String(error))
  const { newIssueUrl } = githubIssueUrls(coercedError, issueLabels, issueTitle)

  return (
    <div className="error-card" role="status" aria-live="polite">
      <span className="error-card-msg">{coercedError.message}</span>
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
