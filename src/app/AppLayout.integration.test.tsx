import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Sentry from '@sentry/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'
import { installMatchMedia, restoreMatchMedia, type MatchMediaStub } from '../test/matchMediaStub'


vi.mock('./routeComponents', async (importActual) => {
  const actual = await importActual<typeof import('./routeComponents')>()
  return {
    ...actual,
    BuildPlanView: function ThrowingView(): never {
      throw new Error('view-crash-for-test')
    },
  }
})

let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errorSpy.mockRestore()
})

function renderApp(initialPath = '/build-plan'): void {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }))
  render(
    <CharacterProvider>
      <RouterProvider router={router} />
    </CharacterProvider>,
  )
}

describe('AppLayout error boundaries', () => {
  it('renders ErrorScreen inside the Outlet when a view crashes', async () => {
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(screen.getByText('view-crash-for-test')).toBeInTheDocument()
  })

  it('keeps the shell (nav bar + bottom bar) interactive when a view crashes', async () => {
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(document.querySelector('.app-nav-bar')).not.toBeNull()
    expect(document.querySelector('.bottom-bar')).not.toBeNull()
  })

  it('captures the view-crash error to Sentry with the React component stack', async () => {
    const captureSpy = vi.mocked(Sentry.captureException)
    captureSpy.mockClear()
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(captureSpy).toHaveBeenCalled()
    const [exception, context] = captureSpy.mock.calls[0]
    expect(exception).toBeInstanceOf(Error)
    expect((exception as Error).message).toBe('view-crash-for-test')
    const stack = (context as { contexts?: { react?: { componentStack?: string } } })?.contexts?.react?.componentStack
    expect(stack).toBeTypeOf('string')
  })
})

describe('AppLayout mobile nav overlay', () => {
  const realWidth = window.innerWidth

  function setViewportWidth(width: number): MatchMediaStub {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      writable: true,
      configurable: true,
    })
    return installMatchMedia((query) => query.includes('599px') && width < 600)
  }

  function expandNavBar(): Promise<void> {
    const toggle = document.querySelector('.nav-bar-collapse-btn')
    if (!(toggle instanceof HTMLElement)) throw new Error('nav bar toggle not found')
    return userEvent.click(toggle)
  }

  afterEach(() => {
    restoreMatchMedia()
    Object.defineProperty(window, 'innerWidth', {
      value: realWidth,
      writable: true,
      configurable: true,
    })
  })

  it('inerts the content, side panel, and bottom bar while the overlay is open', async () => {
    setViewportWidth(500)
    localStorage.setItem('ddo-nav-bar-expanded', 'false')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })

    await expandNavBar()

    expect(document.querySelector('.app-content')).toHaveAttribute('inert')
    expect(document.querySelector('.side-panel')).toHaveAttribute('inert')
    expect(document.querySelector('.bottom-bar')).toHaveAttribute('inert')
    expect(document.querySelector('.app-nav-bar')).not.toHaveAttribute('inert')
  })

  it('collapses the overlay on Escape and lifts every inert', async () => {
    setViewportWidth(500)
    localStorage.setItem('ddo-nav-bar-expanded', 'false')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    await expandNavBar()
    expect(document.querySelector('.app-nav-bar')).toHaveClass('expanded')

    await userEvent.keyboard('{Escape}')

    expect(document.querySelector('.app-nav-bar')).not.toHaveClass('expanded')
    expect(document.querySelector('.app-content')).not.toHaveAttribute('inert')
    expect(document.querySelector('.side-panel')).not.toHaveAttribute('inert')
    expect(document.querySelector('.bottom-bar')).not.toHaveAttribute('inert')
  })

  it('drops the overlay when the viewport grows past the breakpoint, keeping the nav expanded', async () => {
    const matchMedia = setViewportWidth(500)
    localStorage.setItem('ddo-nav-bar-expanded', 'false')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    await expandNavBar()
    expect(document.querySelector('.app-content')).toHaveAttribute('inert')

    act(() => matchMedia.emitChange('(max-width: 599px)', false))

    expect(document.querySelector('.app-nav-bar')).toHaveClass('expanded')
    expect(document.querySelector('.app-content')).not.toHaveAttribute('inert')
    expect(document.querySelector('.side-panel')).not.toHaveAttribute('inert')
    expect(document.querySelector('.bottom-bar')).not.toHaveAttribute('inert')
  })

  it('leaves an expanded desktop nav bar as ordinary inline chrome', async () => {
    setViewportWidth(1200)
    localStorage.setItem('ddo-nav-bar-expanded', 'true')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(document.querySelector('.app-nav-bar')).toHaveClass('expanded')

    expect(document.querySelector('.app-content')).not.toHaveAttribute('inert')
    expect(document.querySelector('.side-panel')).not.toHaveAttribute('inert')
    expect(document.querySelector('.bottom-bar')).not.toHaveAttribute('inert')
  })
})
