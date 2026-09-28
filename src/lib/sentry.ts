import * as Sentry from '@sentry/react'
import { sanitizeUrl } from './githubIssue'

export function initSentry(): void {
  const dsn = import.meta.env.SENTRY_DSN
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
      tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
      replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
      replaysOnErrorSampleRate: 1.0,
      sendDefaultPii: false,
      beforeSend(event) {
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

export function captureBoundary(error: unknown, info: BoundaryErrorInfo): void {
  const err = error instanceof Error ? error : new Error(String(error))
  try {
    Sentry.captureException(err, {
      contexts: { react: { componentStack: info.componentStack ?? '' } },
    })
  } catch {}
}

export interface SentryContextSnapshot {
  eventId?: string
  replayUrl?: string
}

export function getLastSentryContext(): SentryContextSnapshot {
  try {
    const eventId = Sentry.lastEventId() ?? undefined
    const replay = Sentry.getReplay?.()
    const replayId = replay?.getReplayId?.() ?? undefined
    const orgSlug = import.meta.env.SENTRY_ORG
    const replayUrl = replayId && orgSlug
      ? `https://${orgSlug}.sentry.io/replays/${replayId}/`
      : undefined
    return { eventId, replayUrl }
  } catch {
    return {}
  }
}
