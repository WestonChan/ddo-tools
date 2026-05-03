import * as Sentry from '@sentry/react'
import { sanitizeUrl } from './githubIssue'

/** Initialize Sentry. No-op when `VITE_SENTRY_DSN` is unset (local dev
 *  without a DSN). Wrapped in try/catch — a malformed DSN throws on init
 *  in some Sentry versions and we don't want a misconfigured env var to
 *  brick the whole app at module-load time. */
export function initSentry(): void {
  // Read at call time, not module-load time, so tests can stub the env
  // before invocation.
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) {
    console.info('[sentry] no DSN configured; skipping init')
    return
  }
  try {
    Sentry.init({
      dsn,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: true,
          maskAllInputs: true,
          blockAllMedia: false,
        }),
      ],
      // Sample rates: full capture in dev so the dev can verify the feature
      // works at all; light sampling in prod once a userbase justifies it.
      tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
      replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: false,
      beforeSend(event) {
        // Strip URL query/hash (future share-link payloads may carry tokens)
        // plus headers and user — DDO Tools has no auth, but defaults stay
        // safe in case Phase 5+ introduces personal data.
        if (event.request?.url) {
          event.request.url = sanitizeUrl(event.request.url)
        }
        if (event.request) {
          delete event.request.headers
        }
        delete event.user
        return event
      },
    })
  } catch (err) {
    console.warn('[sentry] init failed (likely malformed DSN):', err)
  }
}

export interface BoundaryErrorInfo {
  componentStack?: string | null
}

/** Adapter for `react-error-boundary`'s `onError` callback. Passes the React
 *  component stack into Sentry's `contexts.react.componentStack` so the
 *  Sentry dashboard shows the React tree, not just the JS stack. Without
 *  this adapter, calling `Sentry.captureException` directly silently drops
 *  the component stack because the hint shape mismatches.
 *
 *  Accepts `unknown` because react-error-boundary v6 broadened its onError
 *  signature; we narrow to Error here so callers don't have to. */
export function captureBoundary(error: unknown, info: BoundaryErrorInfo): void {
  const err = error instanceof Error ? error : new Error(String(error))
  try {
    Sentry.captureException(err, {
      contexts: { react: { componentStack: info.componentStack ?? '' } },
    })
  } catch {
    // Don't let Sentry-not-initialized failures bubble out of an
    // error-boundary onError callback.
  }
}

export interface SentryContextSnapshot {
  eventId?: string
  replayUrl?: string
}

/** Read the most recent Sentry event ID + replay ID for inclusion in a
 *  user-initiated GitHub issue body. Wrapped in try/catch — must never
 *  throw, since the static "Report a bug" button is the user's last
 *  resort when the rest of the app (including Sentry) may be broken.
 *
 *  When `VITE_SENTRY_ORG` is set, the returned `replayUrl` is a fully
 *  clickable link into the Sentry dashboard for that org. Without an
 *  org slug, the field is omitted (the eventId in the body is still
 *  enough for a manual lookup). */
export function getLastSentryContext(): SentryContextSnapshot {
  try {
    const eventId = Sentry.lastEventId() ?? undefined
    const replay = Sentry.getReplay?.()
    const replayId = replay?.getReplayId?.() ?? undefined
    const orgSlug = import.meta.env.VITE_SENTRY_ORG
    const replayUrl = replayId && orgSlug
      ? `https://${orgSlug}.sentry.io/replays/${replayId}/`
      : undefined
    return { eventId, replayUrl }
  } catch {
    return {}
  }
}
