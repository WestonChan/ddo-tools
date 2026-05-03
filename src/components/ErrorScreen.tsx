import type { JSX, ReactNode } from 'react'
import { buildIssueUrls } from '../lib/githubIssue'
import './ErrorScreen.css'

export interface ErrorScreenProps {
  heading: string
  /** Used to populate the GitHub issue link's title + stack trace. Accepts
   *  `unknown` for compatibility with `react-error-boundary`'s `FallbackProps`
   *  (which widened to `unknown` in v6); the component narrows to `Error`
   *  internally. Synthetic errors are OK for non-crash use cases (e.g.,
   *  NotFoundView passes `new Error('404 — ' + path)`). When omitted and
   *  `body` is also omitted, no detail block renders. */
  error?: Error | unknown
  /** Visible primary content. If omitted and `error` is present, renders
   *  `error.message` in a monospace block. Used by NotFoundView to show
   *  the attempted path instead of an error message. */
  body?: ReactNode
  /** Secondary explanatory text below the body. */
  hint?: ReactNode
  /** Action buttons row. Use shared `.btn-primary` / `.btn-ghost` classes.
   *  Can also be a render-prop receiving `{ resetErrorBoundary }` so callers
   *  using `<ErrorScreen>` as a `FallbackComponent` can wire the boundary's
   *  reset into a "Try again" button. */
  actions?:
    | ReactNode
    | ((helpers: { resetErrorBoundary?: () => void }) => ReactNode)
  /** Issue labels for the Report link. Labels must exist in the repo
   *  (create via `gh label create <name>`); GitHub silently drops unknown
   *  labels from new issues and search returns no results. */
  labels?: string | string[]
  /** 'error' (default) shows danger styling on the heading; 'info' is
   *  neutral, used for wayfinding (e.g., 404 page). */
  tone?: 'error' | 'info'
  /** Boundary contract pass-through. When `<ErrorScreen>` is used as a
   *  `react-error-boundary` `FallbackComponent`, the boundary supplies this
   *  via `{...props}` spread; the component forwards it to the `actions`
   *  render-prop helpers. */
  resetErrorBoundary?: () => void
}

/** Full-viewport error display: heading + monospace detail (or custom body)
 *  + optional hint + action buttons + GitHub Report link.
 *  Used by: root error boundary, view-level error boundary, DatabaseGate
 *  error mode, NotFoundView. */
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
  // No programmatic focus on mount. `role="alert"` on the wrapper handles
  // the SR announcement; keyboard users navigate via Tab from wherever
  // they were; mouse users see no stray focus rings on the heading or
  // any auto-focused button — just clean text and visible buttons.

  // Narrow `error: unknown` (boundary contract) to `Error` for downstream
  // rendering. Defined errors that aren't Error instances get wrapped so
  // `error.message` is always safe to render.
  const err: Error | undefined = error instanceof Error
    ? error
    : error !== undefined
      ? new Error(String(error))
      : undefined

  // Resolve render-prop actions so callers using `<ErrorScreen>` as a
  // FallbackComponent can wire `resetErrorBoundary` into a "Try again" button.
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
