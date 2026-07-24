import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildWikiPageUrl, openCompareWindow, WIKI_COMPARE_WINDOW } from './client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('buildWikiPageUrl', () => {
  it('converts spaces to underscores under the /page/ base', () => {
    expect(buildWikiPageUrl('Voice of the Master')).toBe(
      'https://ddowiki.com/page/Voice_of_the_Master',
    )
  })

  it('percent-encodes special characters', () => {
    expect(buildWikiPageUrl("Item:Sting of the Ninja")).toBe(
      'https://ddowiki.com/page/Item%3ASting_of_the_Ninja',
    )
  })
})

describe('openCompareWindow', () => {
  function stubScreen(availWidth: number, availHeight: number): void {
    vi.stubGlobal('screen', { availWidth, availHeight })
  }

  it('opens the shared named window as a right-half popup and focuses it', () => {
    stubScreen(2000, 1100)
    const focus = vi.fn()
    const open = vi.fn().mockReturnValue({ focus })
    vi.stubGlobal('open', open)

    openCompareWindow('https://ddowiki.com/page/Favor')

    expect(open).toHaveBeenCalledTimes(1)
    const [url, name, features] = open.mock.calls[0] as [string, string, string]
    expect(url).toBe('https://ddowiki.com/page/Favor')
    expect(name).toBe(WIKI_COMPARE_WINDOW)
    // Left-half sizing: width capped at 1000, anchored to the left edge.
    expect(features).toContain('popup=yes')
    expect(features).toContain('width=1000')
    expect(features).toContain('height=1100')
    expect(features).toContain('left=0')
    expect(focus).toHaveBeenCalled()
  })

  it('halves narrow screens instead of using the 1000px cap', () => {
    stubScreen(1200, 800)
    const open = vi.fn().mockReturnValue(null)
    vi.stubGlobal('open', open)

    openCompareWindow('https://ddowiki.com/page/Favor')

    const [, , features] = open.mock.calls[0] as [string, string, string]
    expect(features).toContain('width=600')
    expect(features).toContain('left=0')
  })

  it('tolerates a blocked popup (window.open returns null)', () => {
    stubScreen(2000, 1100)
    vi.stubGlobal('open', vi.fn().mockReturnValue(null))
    expect(() => openCompareWindow('https://ddowiki.com/page/Favor')).not.toThrow()
  })
})
