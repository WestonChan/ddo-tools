import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import { captureBoundaryError, lastSentryEventReference, initializeSentry } from './sentry'

describe('initializeSentry', () => {
  const sentryInitSpy = vi.mocked(Sentry.init)
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    sentryInitSpy.mockClear()
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleInfoSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('skips init and logs an info message when no DSN is configured', () => {
    vi.stubEnv('SENTRY_DSN', '')
    initializeSentry()
    expect(sentryInitSpy).not.toHaveBeenCalled()
    expect(consoleInfoSpy).toHaveBeenCalled()
  })

  it.each(['development', 'production'])('tags events with the %s Vite mode', (mode) => {
    vi.stubEnv('SENTRY_DSN', 'https://key@o0.ingest.sentry.io/0')
    vi.stubEnv('MODE', mode)
    initializeSentry()
    expect(sentryInitSpy).toHaveBeenCalledWith(expect.objectContaining({ environment: mode }))
  })

  it('does not crash when Sentry.init throws (e.g. malformed DSN)', () => {
    vi.stubEnv('SENTRY_DSN', 'not-a-real-dsn')
    sentryInitSpy.mockImplementationOnce(() => {
      throw new Error('Invalid DSN')
    })
    expect(() => initializeSentry()).not.toThrow()
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('init failed'),
      expect.anything(),
    )
  })
})

describe('captureBoundaryError', () => {
  const captureExceptionSpy = vi.mocked(Sentry.captureException)

  beforeEach(() => {
    captureExceptionSpy.mockClear()
  })

  it('forwards the error and attaches the React component stack', () => {
    const err = new Error('boom')
    captureBoundaryError(err, { componentStack: '\n  at View\n  at AppLayout' })
    expect(captureExceptionSpy).toHaveBeenCalledOnce()
    const [exception, captureContext] = captureExceptionSpy.mock.calls[0]
    expect(exception).toBe(err)
    expect(captureContext).toEqual({
      contexts: { react: { componentStack: '\n  at View\n  at AppLayout' } },
    })
  })

  it('handles a missing componentStack by passing an empty string', () => {
    captureBoundaryError(new Error('x'), {})
    const [, captureContext] = captureExceptionSpy.mock.calls[0]
    expect(captureContext).toEqual({ contexts: { react: { componentStack: '' } } })
  })

  it('does not throw when Sentry.captureException itself throws', () => {
    captureExceptionSpy.mockImplementationOnce(() => {
      throw new Error('Sentry not initialized')
    })
    expect(() => captureBoundaryError(new Error('x'), {})).not.toThrow()
  })
})

describe('lastSentryEventReference', () => {
  const lastEventIdSpy = vi.mocked(Sentry.lastEventId)
  const getReplaySpy = vi.mocked(Sentry.getReplay)

  beforeEach(() => {
    lastEventIdSpy.mockReset()
    getReplaySpy.mockReset()
  })

  it('returns an empty object when Sentry is not initialized', () => {
    lastEventIdSpy.mockReturnValueOnce(undefined)
    getReplaySpy.mockReturnValueOnce(undefined)
    expect(lastSentryEventReference()).toEqual({ eventId: undefined, replayUrl: undefined })
  })

  it('returns the most recent event ID when Sentry has captured one', () => {
    lastEventIdSpy.mockReturnValueOnce('evt_test')
    getReplaySpy.mockReturnValueOnce(undefined)
    expect(lastSentryEventReference().eventId).toBe('evt_test')
  })

  it('returns a clickable Sentry replay URL when getReplay() reports a replay ID and SENTRY_ORG is set', () => {
    vi.stubEnv('SENTRY_ORG', 'weston-00')
    lastEventIdSpy.mockReturnValueOnce('evt_a')
    getReplaySpy.mockReturnValueOnce({
      getReplayId: () => 'rep_xyz',
    } as unknown as ReturnType<typeof Sentry.getReplay>)
    const sentryEventReference = lastSentryEventReference()
    expect(sentryEventReference.eventId).toBe('evt_a')
    expect(sentryEventReference.replayUrl).toBe('https://weston-00.sentry.io/replays/rep_xyz/')
    vi.unstubAllEnvs()
  })

  it('omits replayUrl when SENTRY_ORG is unset (replay ID alone is not enough to build a link)', () => {
    vi.stubEnv('SENTRY_ORG', '')
    lastEventIdSpy.mockReturnValueOnce('evt_a')
    getReplaySpy.mockReturnValueOnce({
      getReplayId: () => 'rep_xyz',
    } as unknown as ReturnType<typeof Sentry.getReplay>)
    const sentryEventReference = lastSentryEventReference()
    expect(sentryEventReference.eventId).toBe('evt_a')
    expect(sentryEventReference.replayUrl).toBeUndefined()
    vi.unstubAllEnvs()
  })

  it('returns an empty object when an underlying Sentry call throws', () => {
    lastEventIdSpy.mockImplementationOnce(() => {
      throw new Error('Sentry broken')
    })
    expect(lastSentryEventReference()).toEqual({})
  })
})
