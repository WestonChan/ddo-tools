import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WikiLinkIcon } from './WikiLinkIcon'
import { WIKI_COMPARE_WINDOW_NAME } from '../lib/wiki/pageLinks'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubWindowOpen(): ReturnType<typeof vi.fn> {
  const windowOpenStub = vi.fn().mockReturnValue(null)
  vi.stubGlobal('open', windowOpenStub)
  return windowOpenStub
}

describe('WikiLinkIcon', () => {
  it('prefers the href prop over a pageName-derived URL and targets the shared compare window', () => {
    render(<WikiLinkIcon href="https://ddowiki.com/page/Item:Foo" pageName="Foo" />)
    const link = screen.getByRole('link', { name: 'Open Foo on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Item:Foo')
    expect(link).toHaveAttribute('target', WIKI_COMPARE_WINDOW_NAME)
  })

  it('derives the URL from pageName when no href is given', () => {
    render(<WikiLinkIcon pageName="Voice of the Master" />)
    const link = screen.getByRole('link', { name: 'Open Voice of the Master on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Voice_of_the_Master')
  })

  it('renders nothing when neither href nor pageName is provided', () => {
    const { container } = render(<WikiLinkIcon />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens the compare window on plain click instead of navigating', () => {
    const windowOpenStub = stubWindowOpen()
    render(<WikiLinkIcon pageName="Favor" />)
    const link = screen.getByRole('link', { name: 'Open Favor on DDO Wiki' })

    const isDefaultActionAllowed = fireEvent.click(link)

    expect(isDefaultActionAllowed).toBe(false)
    expect(windowOpenStub).toHaveBeenCalledTimes(1)
    const [openedUrl, windowName] = windowOpenStub.mock.calls[0] as [string, string, string]
    expect(openedUrl).toBe('https://ddowiki.com/page/Favor')
    expect(windowName).toBe(WIKI_COMPARE_WINDOW_NAME)
  })

  it('leaves modified clicks (cmd/ctrl) to native new-tab behavior', () => {
    const windowOpenStub = stubWindowOpen()
    render(<WikiLinkIcon pageName="Favor" />)
    const link = screen.getByRole('link', { name: 'Open Favor on DDO Wiki' })

    const isMetaClickDefaultAllowed = fireEvent.click(link, { metaKey: true })
    const isControlClickDefaultAllowed = fireEvent.click(link, { ctrlKey: true })

    expect(isMetaClickDefaultAllowed).toBe(true)
    expect(isControlClickDefaultAllowed).toBe(true)
    expect(windowOpenStub).not.toHaveBeenCalled()
  })
})
