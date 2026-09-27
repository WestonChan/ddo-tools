import type { JSX, ReactNode } from 'react'
import { buildIssueUrls } from '../lib/githubIssue'
import './ErrorScreen.css'

export interface ErrorScreenProps {
  heading: string
  error?: Error | unknown
  body?: ReactNode
  hint?: ReactNode
  actions?:
    | ReactNode
    | ((helpers: { resetErrorBoundary?: () => void }) => ReactNode)
  labels?: string | string[]
  tone?: 'error' | 'info'
  resetErrorBoundary?: () => void
}

export function ErrorScreen({
  heading,
  error,
  body,
  hint,
  actions,
  labels,
  tone = 'error',
  resetErrorBoundary,
}: ErrorScreenProps): JSX.Element {

  const err: Error | undefined = error instanceof Error
    ? error
    : error !== undefined
      ? new Error(String(error))
      : undefined

  const resolvedActions = typeof actions === 'function'
    ? actions({ resetErrorBoundary })
    : actions

  const labelList = labels ? (Array.isArray(labels) ? labels : [labels]) : []
  const showReportLink = labelList.length > 0 || err !== undefined

  const detail = body !== undefined
    ? body
    : err !== undefined
      ? <p className="error-screen-detail">{err.message}</p>
      : null

  return (
    <div
      className={`error-screen${tone === 'info' ? ' error-screen--info' : ''}`}
      role="alert"
    >
      <h1>{heading}</h1>
      {detail}
      {hint && <p className="error-screen-hint">{hint}</p>}
      {resolvedActions && <div className="error-screen-actions">{resolvedActions}</div>}
      {showReportLink && <ReportLink error={err} labels={labelList} />}
    </div>
  )
}

function ReportLink({ error, labels }: { error?: Error; labels: string[] }): JSX.Element {
  const { searchUrl, newIssueUrl } = buildIssueUrls(error, labels)
  const showSearchLink = labels.length > 0
  return (
    <p className="error-screen-report">
      {showSearchLink ? (
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
