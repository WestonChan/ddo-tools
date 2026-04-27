import { render, cleanup } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { useFaviconAccent } from './useFaviconAccent'

function HookHarness(): null {
  useFaviconAccent()
  return null
}

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

describe('useFaviconAccent', () => {
  beforeEach(() => {
    document.querySelectorAll('link[rel="icon"]').forEach((el) => el.remove())
    document.documentElement.style.removeProperty('--accent')
  })

  afterEach(() => {
    cleanup()
  })

  it('creates a <link rel="icon"> with a blob: href on mount', () => {
    expect(getFaviconLink()).toBeNull()
    render(<HookHarness />)

    const link = getFaviconLink()
    expect(link).not.toBeNull()
    expect(link!.type).toBe('image/svg+xml')
    expect(link!.href.startsWith('blob:')).toBe(true)
  })

  it('reuses the existing <link rel="icon"> if one is present in the head', () => {
    const existing = document.createElement('link')
    existing.rel = 'icon'
    existing.type = 'image/svg+xml'
    existing.href = 'about:blank'
    document.head.appendChild(existing)

    render(<HookHarness />)

    const links = document.querySelectorAll('link[rel="icon"]')
    expect(links.length).toBe(1) // not duplicated
    expect((links[0] as HTMLLinkElement).href.startsWith('blob:')).toBe(true)
  })

  it('regenerates the favicon when documentElement.style changes', async () => {
    render(<HookHarness />)
    const initialHref = getFaviconLink()!.href

    document.documentElement.style.setProperty('--accent', '#ff0000')

    // MutationObserver fires asynchronously — wait a microtask.
    await new Promise((resolve) => setTimeout(resolve, 0))

    const updatedHref = getFaviconLink()!.href
    expect(updatedHref).not.toBe(initialHref)
    expect(updatedHref.startsWith('blob:')).toBe(true)
  })

  it('revokes the previous blob URL on swap to avoid leaks', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    render(<HookHarness />)

    document.documentElement.style.setProperty('--accent', '#00ff00')
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(revokeSpy).toHaveBeenCalled()
    revokeSpy.mockRestore()
  })
})
