import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Sentry from '@sentry/react'
import { captureBoundary, getLastSentryContext, initSentry } from './sentry'

describe('initSentry', () => {
  const initSpy = vi.mocked(Sentry.init)
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    initSpy.mockClear()
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    infoSpy.mockRestore()
    warnSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('skips init and logs an info message when no DSN is configured', () => {
    // Force DSN empty in case the dev's .env.local or .env supplies one —
    // we're testing the behavior, not the local env.
    vi.stubEnv('VITE_SENTRY_DSN', '')
    initSentry()
    expect(initSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalled()
  })

  it('does not crash when Sentry.init throws (e.g. malformed DSN)', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'not-a-real-dsn')
    initSpy.mockImplementationOnce(() => {
      throw new Error('Invalid DSN')
    })
    expect(() => initSentry()).not.toThrow()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('init failed'), expect.anything())
  })
})

describe('captureBoundary', () => {
  const captureSpy = vi.mocked(Sentry.captureException)

  beforeEach(() => {
    captureSpy.mockClear()
  })

  it('forwards the error and attaches the React component stack', () => {
    const err = new Error('boom')
    captureBoundary(err, { componentStack: '\n  at View\n  at AppLayout' })
    expect(captureSpy).toHaveBeenCalledOnce()
    const [exception, context] = captureSpy.mock.calls[0]
    expect(exception).toBe(err)
    expect(context).toEqual({
      contexts: { react: { componentStack: '\n  at View\n  at AppLayout' } },
    })
  })

  it('handles a missing componentStack by passing an empty string', () => {
    captureBoundary(new Error('x'), {})
    const [, context] = captureSpy.mock.calls[0]
    expect(context).toEqual({ contexts: { react: { componentStack: '' } } })
  })

  it('does not throw when Sentry.captureException itself throws', () => {
    captureSpy.mockImplementationOnce(() => {
      throw new Error('Sentry not initialized')
    })
    expect(() => captureBoundary(new Error('x'), {})).not.toThrow()
  })
})

describe('getLastSentryContext', () => {
  const lastEventIdSpy = vi.mocked(Sentry.lastEventId)
  const getReplaySpy = vi.mocked(Sentry.getReplay)

  beforeEach(() => {
    lastEventIdSpy.mockReset()
    getReplaySpy.mockReset()
  })

  it('returns an empty object when Sentry is not initialized', () => {
    lastEventIdSpy.mockReturnValueOnce(undefined)
    getReplaySpy.mockReturnValueOnce(undefined)
    expect(getLastSentryContext()).toEqual({ eventId: undefined, replayUrl: undefined })
  })

  it('returns the most recent event ID when Sentry has captured one', () => {
    lastEventIdSpy.mockReturnValueOnce('evt_test')
    getReplaySpy.mockReturnValueOnce(undefined)
    expect(getLastSentryContext().eventId).toBe('evt_test')
  })

  it('returns a clickable Sentry replay URL when getReplay() reports a replay ID and VITE_SENTRY_ORG is set', () => {
    vi.stubEnv('VITE_SENTRY_ORG', 'weston-00')
    lastEventIdSpy.mockReturnValueOnce('evt_a')
    // Replay handle exposes getReplayId(); we only need the shape here.
    getReplaySpy.mockReturnValueOnce({
      getReplayId: () => 'rep_xyz',
    } as unknown as ReturnType<typeof Sentry.getReplay>)
    const ctx = getLastSentryContext()
    expect(ctx.eventId).toBe('evt_a')
    expect(ctx.replayUrl).toBe('https://weston-00.sentry.io/replays/rep_xyz/')
    vi.unstubAllEnvs()
  })

  it('omits replayUrl when VITE_SENTRY_ORG is unset (replay ID alone is not enough to build a link)', () => {
    vi.stubEnv('VITE_SENTRY_ORG', '')
    lastEventIdSpy.mockReturnValueOnce('evt_a')
    getReplaySpy.mockReturnValueOnce({
      getReplayId: () => 'rep_xyz',
    } as unknown as ReturnType<typeof Sentry.getReplay>)
    const ctx = getLastSentryContext()
    expect(ctx.eventId).toBe('evt_a')
    expect(ctx.replayUrl).toBeUndefined()
    vi.unstubAllEnvs()
  })

  it('returns an empty object when an underlying Sentry call throws', () => {
    lastEventIdSpy.mockImplementationOnce(() => {
      throw new Error('Sentry broken')
    })
    expect(getLastSentryContext()).toEqual({})
  })
})
