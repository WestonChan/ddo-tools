import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as Sentry from '@sentry/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'
import { installMatchMedia, restoreMatchMedia, type MatchMediaStub } from '../test/matchMediaStub'

// Tests for the headline behavior of Phase 3: when a route component
// crashes, the app shell (nav bar, bottom bar, side panel) stays
// rendered, the user sees ErrorScreen inside the Outlet area, and
// Sentry receives the captureException with the React component stack.

vi.mock('../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: {}, loading: false, error: null }),
}))

// Replace BuildPlanView with a deliberately-throwing component so we can
// observe the view boundary catching it. Other route exports stay real
// so the surrounding shell renders normally.
vi.mock('./routeComponents', async (importActual) => {
  const actual = await importActual<typeof import('./routeComponents')>()
  return {
    ...actual,
    BuildPlanView: function ThrowingView(): never {
      throw new Error('view-crash-for-test')
    },
  }
})

// Suppress React's noisy "uncaught error" log during deliberate throws.
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
    // Nav bar still rendered alongside the view-level ErrorScreen.
    expect(document.querySelector('.app-nav-bar')).not.toBeNull()
    // Bottom bar remains rendered (didn't crash).
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
    // Component stack is included via the captureBoundary adapter.
    const stack = (context as { contexts?: { react?: { componentStack?: string } } })?.contexts?.react?.componentStack
    expect(stack).toBeTypeOf('string')
  })
})

// Below 600px the expanded nav bar covers the whole viewport (AppNavBar.css).
// AppLayout has to treat it as a modal: everything behind it goes `inert`, and
// Escape dismisses it. The nav bar itself must stay interactive — inerting the
// overlay along with the rest of the chrome would make it unusable.
describe('AppLayout mobile nav overlay', () => {
  const realWidth = window.innerWidth

  /** Returns the stub so a test can emit a later breakpoint crossing. Only the
   *  (max-width: 599px) query AppLayout asks about needs a real answer. */
  function setViewportWidth(width: number): MatchMediaStub {
    Object.defineProperty(window, 'innerWidth', {
      value: width,
      writable: true,
      configurable: true,
    })
    return installMatchMedia((query) => query.includes('599px') && width < 600)
  }

  function expandNavBar(): Promise<void> {
    // The collapse/expand toggle is icon-only when collapsed, so it has no
    // accessible name to query by.
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
    // Rotating a phone to landscape (or dragging a narrow window wider) crosses
    // 600px with the nav still expanded. `navOverlayActive` has to recompute
    // from the media-query change alone — nothing else re-renders AppLayout —
    // and the nav must stay expanded, becoming an ordinary sidebar rather than
    // collapsing or leaving the background stuck inert.
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
