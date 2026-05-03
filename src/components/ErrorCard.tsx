import type { JSX } from 'react'
import { buildIssueUrls } from '../lib/githubIssue'
import './ErrorCard.css'

export interface ErrorCardProps {
  /** Accepts `unknown` for compatibility with `react-error-boundary`'s
   *  `FallbackProps`; narrowed to `Error` internally. */
  error: Error | unknown
  /** GitHub issue labels for the Report link. */
  labels?: string | string[]
  /** Compact context string shown alongside the message and used as the
   *  issue title prefix, e.g. "patch-notes-2026-04-27" or "Item #1234". */
  context?: string
  /** Boundary contract pass-through. Unused by ErrorCard's render but
   *  accepted so callers can spread `{...fallbackProps}` directly. */
  resetErrorBoundary?: () => void
}

/** Compact inline error display for slot-level failures (chrome boundaries
 *  around AppLayout siblings, future per-row failures in lists/grids).
 *  `role="status" aria-live="polite"` so multiple cards in a cascade don't
 *  trigger N screen-reader announcements. */
export function ErrorCard({ error, labels, context }: ErrorCardProps): JSX.Element {
  // Narrow `error: unknown` to `Error` so `.message` is always safe to read.
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
