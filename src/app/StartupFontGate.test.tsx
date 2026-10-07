import { useEffect, type JSX } from 'react'
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StartupFontGate } from './StartupFontGate'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function MountedApp({ onMount }: { onMount: () => void }): JSX.Element {
  useEffect(onMount, [onMount])
  return <main>App content</main>
}

describe('StartupFontGate', () => {
  it('keeps the skeleton visible while fonts load and mounts the app so queries can start', async () => {
    let resolveFonts!: () => void
    const fontsReady = new Promise<void>((resolve) => {
      resolveFonts = resolve
    })
    const onMount = vi.fn()
    render(
      <StartupFontGate fontsReady={fontsReady}>
        <MountedApp onMount={onMount} />
      </StartupFontGate>,
    )
    expect(onMount).toHaveBeenCalledOnce()
    expect(screen.getByRole('status')).toBeVisible()
    expect(screen.queryByRole('main')).toBeNull()
    expect(screen.getByRole('main', { hidden: true })).toBeInTheDocument()
    await act(async () => resolveFonts())
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('main')).toBeVisible()
  })

  it('reveals the app at the 1500ms cap when fonts remain pending', () => {
    vi.useFakeTimers()
    render(
      <StartupFontGate fontsReady={new Promise(() => {})}>
        <main>App content</main>
      </StartupFontGate>,
    )
    act(() => vi.advanceTimersByTime(1499))
    expect(screen.getByRole('status')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })

  it('reveals the app after a font loading error', async () => {
    let rejectFonts!: (reason: Error) => void
    const fontsReady = new Promise<void>((_, reject) => {
      rejectFonts = reject
    })
    render(
      <StartupFontGate fontsReady={fontsReady}>
        <main>App content</main>
      </StartupFontGate>,
    )
    await act(async () => rejectFonts(new Error('font CDN unavailable')))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
})
