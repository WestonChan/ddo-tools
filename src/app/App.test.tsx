import { render, screen, type RenderResult } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'

// Mock useDatabase so LoadingGate doesn't block rendering. The real App mounts
// under LoadingGate in main.tsx, but the router/layout under test doesn't
// depend on it — we only need the mock because features that import from
// ../hooks may transitively touch it.
vi.mock('../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: {}, loading: false, error: null }),
}))

// In vitest, import.meta.env.BASE_URL resolves to '/', so the router's basepath
// is '/' — memory history entries use plain paths without the /ddo-tools prefix.
function renderApp(initialPath = '/build-plan'): RenderResult {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [initialPath] }))
  return render(
    <CharacterProvider>
      <RouterProvider router={router} />
    </CharacterProvider>,
  )
}

describe('App', () => {
  it('renders the nav bar with navigation', async () => {
    renderApp()
    // Links + buttons in the chrome (nav items, collapse toggle, bottom bar)
    await screen.findByText(/Build Plan coming/)
    const interactive = [...screen.getAllByRole('button'), ...screen.getAllByRole('link')]
    expect(interactive.length).toBeGreaterThanOrEqual(5)
  })

  it('renders placeholder content for default view', async () => {
    renderApp()
    expect(await screen.findByText(/Build Plan coming/)).toBeInTheDocument()
  })

  it('renders the stats panel on build-plan view', async () => {
    renderApp()
    expect(await screen.findByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Feats')).toBeInTheDocument()
  })
})
