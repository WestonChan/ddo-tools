import * as Sentry from '@sentry/react'
import { urlWithoutQueryOrFragment } from './githubIssue'

export function initializeSentry(): void {
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
          event.request.url = urlWithoutQueryOrFragment(event.request.url)
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

export interface ErrorComponentTrace {
  componentStack?: string | null
}

export function captureBoundaryError(error: unknown, componentTrace: ErrorComponentTrace): void {
  const errorToCapture = error instanceof Error ? error : new Error(String(error))
  try {
    Sentry.captureException(errorToCapture, {
      contexts: { react: { componentStack: componentTrace.componentStack ?? '' } },
    })
  } catch {}
}

export interface SentryEventReference {
  eventId?: string
  replayUrl?: string
}

export function lastSentryEventReference(): SentryEventReference {
  try {
    const eventId = Sentry.lastEventId() ?? undefined
    const replay = Sentry.getReplay?.()
    const replayId = replay?.getReplayId?.() ?? undefined
    const organizationSlug = import.meta.env.SENTRY_ORG
    const replayUrl =
      replayId && organizationSlug
        ? `https://${organizationSlug}.sentry.io/replays/${replayId}/`
        : undefined
    return { eventId, replayUrl }
  } catch {
    return {}
  }
}
