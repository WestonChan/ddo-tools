import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'

// Verifies that the chrome boundary around <BottomBar> in AppLayout
// catches a crash inside the bottom bar and renders ErrorCard in just
// that slot — keeping the rest of the app shell + the Outlet view
// fully interactive.

vi.mock('../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: {}, loading: false, error: null }),
}))

vi.mock('./BottomBar', () => ({
  BottomBar: function ThrowingBottomBar(): never {
    throw new Error('bottom-bar-crash-for-test')
  },
}))

// Suppress React's noisy "uncaught error" log during deliberate throws.
let errorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  errorSpy.mockRestore()
})

function renderApp(): void {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/'] }))
  render(
    <CharacterProvider>
      <RouterProvider router={router} />
    </CharacterProvider>,
  )
}

describe('BottomBar chrome boundary', () => {
  it('renders ErrorCard in place of the bottom bar when BottomBar throws', async () => {
    renderApp()
    // findBy* awaits the async router resolution before asserting.
    expect(await screen.findByText('bottom-bar-crash-for-test')).toBeInTheDocument()
    // The Report link inside ErrorCard targets the ddo-tools repo.
    const reportLink = screen.getByRole('link', { name: 'Report' })
    expect(reportLink).toHaveAttribute('href', expect.stringContaining('ddo-tools'))
  })

  it('keeps the rest of the shell rendered when BottomBar crashes', async () => {
    renderApp()
    expect(await screen.findByText('bottom-bar-crash-for-test')).toBeInTheDocument()
    // Nav bar still rendered, even though BottomBar's slot is replaced
    // by ErrorCard.
    expect(document.querySelector('.app-nav-bar')).not.toBeNull()
  })
})
