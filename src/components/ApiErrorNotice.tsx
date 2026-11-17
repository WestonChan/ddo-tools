import type { JSX, ReactNode } from 'react'
import { API_BASE_URL, apiErrorDescription } from '../lib/api'
import { githubIssueUrls } from '../lib/githubIssue'
import { StatusNotice } from './StatusNotice'

interface ApiErrorNoticeProps {
  error: unknown
  path: string
  onRetry: () => void
  missingResourceName?: string
  additionalActions?: ReactNode
  heading?: string
  isCompact?: boolean
}

export function ApiErrorNotice({
  error,
  path,
  onRetry,
  missingResourceName,
  additionalActions,
  heading,
  isCompact = false,
}: ApiErrorNoticeProps): JSX.Element {
  const description = apiErrorDescription(error, { missingResourceName })
  const reportedError = error instanceof Error ? error : new Error(String(error))
  const reportUrl = description.canReport
    ? githubIssueUrls(
        reportedError,
        'bug',
        `Game data error: ${description.kind} on ${path}`,
        undefined,
        [
          `**API path:** ${path}`,
          `**Site version:** ${__APP_VERSION__}`,
          `**API base URL:** ${API_BASE_URL}`,
        ],
      ).newIssueUrl
    : null
  const reportLink = reportUrl ? (
    <a
      className={description.kind === 'our-bug' ? 'btn-primary-sm' : 'btn-ghost-sm'}
      href={reportUrl}
      target="_blank"
      rel="noopener noreferrer"
    >
      Report a bug
    </a>
  ) : null
  const retryButton = description.canRetry ? (
    <button
      type="button"
      className={description.kind === 'our-bug' ? 'btn-ghost-sm' : 'btn-primary-sm'}
      onClick={onRetry}
    >
      Retry
    </button>
  ) : null

  return (
    <StatusNotice
      heading={heading ?? description.heading}
      hint={description.hint}
      isCompact={isCompact}
      actions={
        (reportLink || retryButton || additionalActions) && (
          <>
            {description.kind === 'our-bug' ? reportLink : retryButton}
            {description.kind === 'our-bug' ? retryButton : reportLink}
            {additionalActions}
          </>
        )
      }
    />
  )
}
