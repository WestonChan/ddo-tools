import { render, screen, type RenderResult } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'

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
