import { describe, it, expect, vi, afterEach } from 'vitest'
import { wikiPageUrlFor, openWikiCompareWindow, WIKI_COMPARE_WINDOW_NAME } from './pageLinks'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('wikiPageUrlFor', () => {
  it('converts spaces to underscores under the /page/ base', () => {
    expect(wikiPageUrlFor('Voice of the Master')).toBe(
      'https://ddowiki.com/page/Voice_of_the_Master',
    )
  })

  it('percent-encodes special characters', () => {
    expect(wikiPageUrlFor('Item:Sting of the Ninja')).toBe(
      'https://ddowiki.com/page/Item%3ASting_of_the_Ninja',
    )
  })
})

describe('openWikiCompareWindow', () => {
  function stubAvailableScreenSize(availWidth: number, availHeight: number): void {
    vi.stubGlobal('screen', { availWidth, availHeight })
  }

  it('opens the shared named window as a right-half popup and focuses it', () => {
    stubAvailableScreenSize(2000, 1100)
    const focusMock = vi.fn()
    const windowOpenMock = vi.fn().mockReturnValue({ focus: focusMock })
    vi.stubGlobal('open', windowOpenMock)

    openWikiCompareWindow('https://ddowiki.com/page/Favor')

    expect(windowOpenMock).toHaveBeenCalledTimes(1)
    const [url, windowName, windowFeatures] = windowOpenMock.mock.calls[0] as [
      string,
      string,
      string,
    ]
    expect(url).toBe('https://ddowiki.com/page/Favor')
    expect(windowName).toBe(WIKI_COMPARE_WINDOW_NAME)
    expect(windowFeatures).toContain('popup=yes')
    expect(windowFeatures).toContain('width=1000')
    expect(windowFeatures).toContain('height=1100')
    expect(windowFeatures).toContain('left=0')
    expect(focusMock).toHaveBeenCalled()
  })

  it('halves narrow screens instead of using the 1000px cap', () => {
    stubAvailableScreenSize(1200, 800)
    const open = vi.fn().mockReturnValue(null)
    vi.stubGlobal('open', open)

    openWikiCompareWindow('https://ddowiki.com/page/Favor')

    const [, , windowFeatures] = open.mock.calls[0] as [string, string, string]
    expect(windowFeatures).toContain('width=600')
    expect(windowFeatures).toContain('left=0')
  })

  it('tolerates a blocked popup (window.open returns null)', () => {
    stubAvailableScreenSize(2000, 1100)
    vi.stubGlobal('open', vi.fn().mockReturnValue(null))
    expect(() => openWikiCompareWindow('https://ddowiki.com/page/Favor')).not.toThrow()
  })
})
