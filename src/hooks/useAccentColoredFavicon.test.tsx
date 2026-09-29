import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { useAccentColoredFavicon } from './useAccentColoredFavicon'

function AccentColoredFaviconHarness(): null {
  useAccentColoredFavicon()
  return null
}

function queryFaviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

describe('useAccentColoredFavicon', () => {
  beforeEach(() => {
    document.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove())
    document.documentElement.style.removeProperty('--accent')
  })

  afterEach(() => {
    cleanup()
  })

  it('creates a <link rel="icon"> with a blob: href on mount', () => {
    expect(queryFaviconLink()).toBeNull()
    render(<AccentColoredFaviconHarness />)

    const link = queryFaviconLink()
    expect(link).not.toBeNull()
    expect(link!.type).toBe('image/svg+xml')
    expect(link!.href.startsWith('blob:')).toBe(true)
  })

  it('reuses the existing <link rel="icon"> if one is present in the head', () => {
    const existingFaviconLink = document.createElement('link')
    existingFaviconLink.rel = 'icon'
    existingFaviconLink.type = 'image/svg+xml'
    existingFaviconLink.href = 'about:blank'
    document.head.appendChild(existingFaviconLink)

    render(<AccentColoredFaviconHarness />)

    const faviconLinks = document.querySelectorAll('link[rel="icon"]')
    expect(faviconLinks.length).toBe(1)
    expect((faviconLinks[0] as HTMLLinkElement).href.startsWith('blob:')).toBe(true)
  })

  it('regenerates the favicon when documentElement.style changes', async () => {
    render(<AccentColoredFaviconHarness />)
    const initialHref = queryFaviconLink()!.href

    document.documentElement.style.setProperty('--accent', '#ff0000')

    await new Promise((resolve) => setTimeout(resolve, 0))

    const updatedHref = queryFaviconLink()!.href
    expect(updatedHref).not.toBe(initialHref)
    expect(updatedHref.startsWith('blob:')).toBe(true)
  })

  it('revokes the previous blob URL on swap to avoid leaks', async () => {
    const revokeObjectUrlSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<AccentColoredFaviconHarness />)

    document.documentElement.style.setProperty('--accent', '#00ff00')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(revokeObjectUrlSpy).toHaveBeenCalled()
    revokeObjectUrlSpy.mockRestore()
  })
})
