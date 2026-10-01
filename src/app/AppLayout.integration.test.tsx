import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Sentry from '@sentry/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'
import { installMatchMedia, restoreMatchMedia, type MatchMediaStub } from '../test/matchMediaStub'
import { resetThemeForTests } from '../hooks/useTheme'

vi.mock('./routeComponents', async (importActual) => {
  const actual = await importActual<typeof import('./routeComponents')>()
  return {
    ...actual,
    BuildPlanView: function ThrowingView(): never {
      throw new Error('view-crash-for-test')
    },
  }
})

let consoleErrorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleErrorSpy.mockRestore()
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

  it('keeps the rail interactive when a view crashes', async () => {
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(document.querySelector('.app-nav-bar')).not.toHaveAttribute('inert')
    expect(screen.getByRole('button', { name: /^Warnings/ })).toBeInTheDocument()
  })

  it('captures the view-crash error to Sentry with the React component stack', async () => {
    const captureExceptionSpy = vi.mocked(Sentry.captureException)
    captureExceptionSpy.mockClear()
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(captureExceptionSpy).toHaveBeenCalled()
    const [exception, captureContext] = captureExceptionSpy.mock.calls[0]
    expect(exception).toBeInstanceOf(Error)
    expect((exception as Error).message).toBe('view-crash-for-test')
    const componentStack = (
      captureContext as { contexts?: { react?: { componentStack?: string } } }
    )?.contexts?.react?.componentStack
    expect(componentStack).toBeTypeOf('string')
  })
})

const originalWindowWidth = window.innerWidth

function setViewportWidth(width: number): MatchMediaStub {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    writable: true,
    configurable: true,
  })
  return installMatchMedia((query) => {
    const maximumWidthPx = Number(/max-width:\s*(\d+)px/.exec(query)?.[1] ?? Number.NaN)
    return width <= maximumWidthPx
  })
}

function restoreViewportWidth(): void {
  restoreMatchMedia()
  Object.defineProperty(window, 'innerWidth', {
    value: originalWindowWidth,
    writable: true,
    configurable: true,
  })
}

describe('AppLayout stats panel', () => {
  afterEach(restoreViewportWidth)

  it('hides the stats panel on /build-plan below 900px', async () => {
    setViewportWidth(800)
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(document.querySelector('.stats-panel')).toBeNull()
    expect(document.querySelector('.app')).toHaveClass('app--no-stats')
  })

  it('shows the stats panel on /build-plan at 1200px', async () => {
    setViewportWidth(1200)
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(document.querySelector('.stats-panel')).toBeInTheDocument()
    expect(document.querySelector('.app')).not.toHaveClass('app--no-stats')
  })
})

describe('AppLayout mobile nav overlay', () => {
  function expandNavBar(): Promise<void> {
    const toggle = document.querySelector('.nav-bar-collapse-btn')
    if (!(toggle instanceof HTMLElement)) throw new Error('nav bar toggle not found')
    return userEvent.click(toggle)
  }

  afterEach(restoreViewportWidth)

  it('inerts the content but not the rail while the overlay is open', async () => {
    setViewportWidth(500)
    localStorage.setItem('ddo-nav-bar-expanded', 'false')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })

    await expandNavBar()

    expect(document.querySelector('.app-content')).toHaveAttribute('inert')
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
    expect(document.querySelector('.app-nav-bar')).not.toHaveAttribute('inert')
  })

  it('drops the overlay when the viewport grows past the breakpoint, keeping the nav expanded', async () => {
    const matchMediaStub = setViewportWidth(500)
    localStorage.setItem('ddo-nav-bar-expanded', 'false')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    await expandNavBar()
    expect(document.querySelector('.app-content')).toHaveAttribute('inert')

    act(() => matchMediaStub.emitChange('(max-width: 599px)', false))

    expect(document.querySelector('.app-nav-bar')).toHaveClass('expanded')
    expect(document.querySelector('.app-content')).not.toHaveAttribute('inert')
    expect(document.querySelector('.app-nav-bar')).not.toHaveAttribute('inert')
  })

  it('leaves an expanded desktop nav bar as ordinary inline chrome', async () => {
    setViewportWidth(1200)
    localStorage.setItem('ddo-nav-bar-expanded', 'true')
    renderApp('/build-plan')
    await screen.findByRole('heading', { level: 1, name: 'This view crashed' })
    expect(document.querySelector('.app-nav-bar')).toHaveClass('expanded')

    expect(document.querySelector('.app-content')).not.toHaveAttribute('inert')
    expect(document.querySelector('.stats-panel')).not.toHaveAttribute('inert')
    expect(document.querySelector('.app-nav-bar')).not.toHaveAttribute('inert')
  })
})

describe('AppLayout system theme', () => {
  const PREFERS_LIGHT_QUERY = '(prefers-color-scheme: light)'

  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('theme', 'system')
    resetThemeForTests()
  })
  afterEach(() => {
    restoreMatchMedia()
    resetThemeForTests()
  })

  it('follows an OS color scheme change on a page that does not read the theme', async () => {
    const matchMediaStub = installMatchMedia(false)
    renderApp('/')
    await screen.findByRole('navigation', { name: 'Main' })
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')

    act(() => matchMediaStub.emitChange(PREFERS_LIGHT_QUERY, true))

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })
})
