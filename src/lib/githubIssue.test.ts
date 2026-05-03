import { describe, expect, it } from 'vitest'
import { REPO_URL, buildIssueUrls, sanitizeUrl } from './githubIssue'

describe('sanitizeUrl', () => {
  it('keeps origin + pathname, strips query and hash', () => {
    expect(sanitizeUrl('https://example.com/a/b?token=abc#frag')).toBe(
      'https://example.com/a/b',
    )
  })

  it('returns the URL unchanged when there is no query or hash', () => {
    expect(sanitizeUrl('https://example.com/a/b')).toBe('https://example.com/a/b')
  })

  it('strips both query and hash when both present', () => {
    expect(sanitizeUrl('https://example.com/?a=1&b=2#section')).toBe('https://example.com/')
  })

  it('falls back to a simple split when URL parsing fails', () => {
    expect(sanitizeUrl('not-a-url?a=1#x')).toBe('not-a-url')
  })
})

describe('buildIssueUrls', () => {
  it('points at the ddo-tools repo, not ddo-builder', () => {
    expect(REPO_URL).toBe('https://github.com/WestonChan/ddo-tools')
    const { searchUrl, newIssueUrl } = buildIssueUrls()
    expect(searchUrl).toContain('https://github.com/WestonChan/ddo-tools/issues')
    expect(newIssueUrl).toContain('https://github.com/WestonChan/ddo-tools/issues/new')
  })

  it('encodes a single label into both labels= and label: search query', () => {
    const { searchUrl, newIssueUrl } = buildIssueUrls(undefined, 'db-loading')
    expect(searchUrl).toContain('label%3Adb-loading')
    expect(newIssueUrl).toContain('labels=db-loading')
  })

  it('encodes an array of labels as comma-separated', () => {
    const { searchUrl, newIssueUrl } = buildIssueUrls(undefined, ['runtime', 'not-found'])
    expect(searchUrl).toContain('label%3Aruntime')
    expect(searchUrl).toContain('label%3Anot-found')
    expect(newIssueUrl).toContain('labels=runtime,not-found')
  })

  it('produces a GitHub-style bug-report body template when no error is supplied', () => {
    const { newIssueUrl } = buildIssueUrls()
    const body = decodeURIComponent(newIssueUrl.split('body=')[1] ?? '')
    expect(body).toContain('Describe the bug')
    expect(body).toContain('To reproduce')
    expect(body).toContain('Expected behavior')
    expect(body).toContain('Screenshots')
    expect(body).toContain('Additional context')
  })

  it('uses contextTitle as the issue title when provided', () => {
    const { newIssueUrl } = buildIssueUrls(undefined, [], 'My report')
    expect(newIssueUrl).toContain('title=My%20report')
  })

  it('falls back to "User report" title for user reports without context', () => {
    const { newIssueUrl } = buildIssueUrls()
    expect(newIssueUrl).toContain('title=User%20report')
  })

  it('includes error message and stack trace in the body when error has a stack', () => {
    const err = new Error('something broke')
    err.stack = 'Error: something broke\n  at foo'
    const { newIssueUrl } = buildIssueUrls(err)
    const body = decodeURIComponent(newIssueUrl.split('body=')[1] ?? '')
    expect(body).toContain('something broke')
    expect(body).toContain('Stack trace:')
    expect(body).toContain('at foo')
  })

  it('omits the stack section when error has no stack', () => {
    const err = new Error('no stack')
    delete err.stack
    const { newIssueUrl } = buildIssueUrls(err)
    const body = decodeURIComponent(newIssueUrl.split('body=')[1] ?? '')
    expect(body).toContain('no stack')
    expect(body).not.toContain('Stack trace:')
  })

  it('extracts title from error message before the first em-dash or colon', () => {
    const err = new Error('Failed to fetch DB: 404 Not Found')
    const { newIssueUrl } = buildIssueUrls(err)
    expect(newIssueUrl).toContain('title=Failed%20to%20fetch%20DB')
    expect(newIssueUrl).not.toContain('title=Failed%20to%20fetch%20DB%3A%20404')
  })

  it('falls back to "Untitled error" when error message is empty or punctuation only', () => {
    const empty = new Error('')
    const punct = new Error(':')
    expect(buildIssueUrls(empty).newIssueUrl).toContain('title=Untitled%20error')
    expect(buildIssueUrls(punct).newIssueUrl).toContain('title=Untitled%20error')
  })

  it('includes Sentry event ID and replay URL in body when provided', () => {
    const err = new Error('x')
    const { newIssueUrl } = buildIssueUrls(err, [], undefined, {
      eventId: 'evt_test',
      replayUrl: 'https://sentry.io/replay/abc',
    })
    const body = decodeURIComponent(newIssueUrl.split('body=')[1] ?? '')
    expect(body).toContain('Sentry event:')
    expect(body).toContain('evt_test')
    expect(body).toContain('Replay:')
    expect(body).toContain('https://sentry.io/replay/abc')
  })

  it('omits Sentry context when not provided', () => {
    const err = new Error('x')
    const { newIssueUrl } = buildIssueUrls(err)
    const body = decodeURIComponent(newIssueUrl.split('body=')[1] ?? '')
    expect(body).not.toContain('Sentry event:')
    expect(body).not.toContain('Replay:')
  })

  it('includes sanitized URL and browser UA in the body when window is available', () => {
    const { newIssueUrl } = buildIssueUrls()
    const body = decodeURIComponent(newIssueUrl.split('body=')[1] ?? '')
    expect(body).toContain('URL:')
    expect(body).toContain('Browser:')
  })

  it('produces no labels= param and a bare search query when labels is empty', () => {
    const { searchUrl, newIssueUrl } = buildIssueUrls()
    expect(searchUrl).toBe(`${REPO_URL}/issues?q=is%3Aopen`)
    expect(newIssueUrl).not.toContain('labels=')
  })
})
