import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WikiLinkIcon } from './WikiLinkIcon'
import { WIKI_COMPARE_WINDOW } from '../lib/wiki/client'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function stubOpen(): ReturnType<typeof vi.fn> {
  const open = vi.fn().mockReturnValue(null)
  vi.stubGlobal('open', open)
  return open
}

describe('WikiLinkIcon', () => {
  it('prefers the href prop over a pageName-derived URL and targets the shared compare window', () => {
    render(<WikiLinkIcon href="https://ddowiki.com/page/Item:Foo" pageName="Foo" />)
    const link = screen.getByRole('link', { name: 'Open Foo on DDO Wiki' })
    expect(link).toHaveAttribute('href', 'https://ddowiki.com/page/Item:Foo')
    expect(link).toHaveAttribute('target', WIKI_COMPARE_WINDOW)
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
    const open = stubOpen()
    render(<WikiLinkIcon pageName="Favor" />)
    const link = screen.getByRole('link', { name: 'Open Favor on DDO Wiki' })

    const notPrevented = fireEvent.click(link)

    // fireEvent returns false when preventDefault() was called.
    expect(notPrevented).toBe(false)
    expect(open).toHaveBeenCalledTimes(1)
    const [url, name] = open.mock.calls[0] as [string, string, string]
    expect(url).toBe('https://ddowiki.com/page/Favor')
    expect(name).toBe(WIKI_COMPARE_WINDOW)
  })

  it('leaves modified clicks (cmd/ctrl) to native new-tab behavior', () => {
    const open = stubOpen()
    render(<WikiLinkIcon pageName="Favor" />)
    const link = screen.getByRole('link', { name: 'Open Favor on DDO Wiki' })

    const metaNotPrevented = fireEvent.click(link, { metaKey: true })
    const ctrlNotPrevented = fireEvent.click(link, { ctrlKey: true })

    expect(metaNotPrevented).toBe(true)
    expect(ctrlNotPrevented).toBe(true)
    expect(open).not.toHaveBeenCalled()
  })
})
