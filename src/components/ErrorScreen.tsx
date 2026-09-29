import type { JSX, ReactNode } from 'react'
import { githubIssueUrls } from '../lib/githubIssue'
import './ErrorScreen.css'

export interface ErrorScreenProps {
  heading: string
  error?: Error | unknown
  detail?: ReactNode
  hint?: ReactNode
  actions?:
    | ReactNode
    | ((errorBoundaryControls: { resetErrorBoundary?: () => void }) => ReactNode)
  issueLabels?: string | string[]
  tone?: 'error' | 'info'
  resetErrorBoundary?: () => void
}

export function ErrorScreen({
  heading,
  error,
  detail,
  hint,
  actions,
  issueLabels,
  tone = 'error',
  resetErrorBoundary,
}: ErrorScreenProps): JSX.Element {

  const coercedError: Error | undefined = error instanceof Error
    ? error
    : error !== undefined
      ? new Error(String(error))
      : undefined

  const renderedActions = typeof actions === 'function'
    ? actions({ resetErrorBoundary })
    : actions

  const normalizedIssueLabels = issueLabels ? (Array.isArray(issueLabels) ? issueLabels : [issueLabels]) : []
  const shouldShowReportLink = normalizedIssueLabels.length > 0 || coercedError !== undefined

  const detailToShow = detail !== undefined
    ? detail
    : coercedError !== undefined
      ? <p className="error-screen-detail">{coercedError.message}</p>
      : null

  return (
    <div
      className={`error-screen${tone === 'info' ? ' error-screen--info' : ''}`}
      role="alert"
    >
      <h1>{heading}</h1>
      {detailToShow}
      {hint && <p className="error-screen-hint">{hint}</p>}
      {renderedActions && <div className="error-screen-actions">{renderedActions}</div>}
      {shouldShowReportLink && <IssueReportLinks error={coercedError} issueLabels={normalizedIssueLabels} />}
    </div>
  )
}

function IssueReportLinks({ error, issueLabels }: { error?: Error; issueLabels: string[] }): JSX.Element {
  const { searchUrl, newIssueUrl } = githubIssueUrls(error, issueLabels)
  const shouldShowSearchLink = issueLabels.length > 0
  return (
    <p className="error-screen-report">
      {shouldShowSearchLink ? (
        <>
          This may be a{' '}
          <a href={searchUrl} target="_blank" rel="noopener noreferrer">
            known issue
          </a>
          . If not,{' '}
          <a href={newIssueUrl} target="_blank" rel="noopener noreferrer">
            report it
          </a>
          .
        </>
      ) : (
        <a href={newIssueUrl} target="_blank" rel="noopener noreferrer">
          Report this issue
        </a>
      )}
    </p>
  )
}
