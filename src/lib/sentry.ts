import * as Sentry from '@sentry/react'
import { urlWithoutQueryOrFragment } from './githubIssue'

const identifyingFieldNamesToDeny = ['forwarded', '-ip', 'remote-', 'via', '-user']

const restrictiveDataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: {
    request: { deny: identifyingFieldNamesToDeny },
    response: { deny: identifyingFieldNamesToDeny },
  },
  httpBodies: [],
  urlQueryParams: { deny: identifyingFieldNamesToDeny },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
} satisfies Sentry.BrowserOptions['dataCollection']

export function initializeSentry(): void {
  const dsn = import.meta.env.SENTRY_DSN
  if (!dsn) {
    console.info('[sentry] no DSN configured; skipping init')
    return
  }
  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
      replaysSessionSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
      replaysOnErrorSampleRate: 1.0,
      dataCollection: restrictiveDataCollection,
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
    void addMaskedReplay()
  } catch (err) {
    console.warn('[sentry] init failed (likely malformed DSN):', err)
  }
}

async function addMaskedReplay(): Promise<void> {
  try {
    const { maskedReplayIntegration } = await import('./sentryReplay')
    Sentry.addIntegration(maskedReplayIntegration())
  } catch (err) {
    console.warn('[sentry] session replay failed to load:', err)
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
    const replay =
      Sentry.getClient()?.getIntegrationByName<ReturnType<typeof Sentry.replayIntegration>>(
        'Replay',
      )
    const replayId = replay?.getReplayId() ?? undefined
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
