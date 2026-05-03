import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as Sentry from '@sentry/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'

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
