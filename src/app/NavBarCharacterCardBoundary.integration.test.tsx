import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'

vi.mock('./NavBarCharacterCard', () => ({
  NavBarCharacterCard: function ThrowingNavBarCharacterCard(): never {
    throw new Error('character-card-crash-for-test')
  },
}))

let consoleErrorSpy: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  consoleErrorSpy.mockRestore()
})

function renderApp(): void {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/'] }))
  render(
    <CharacterProvider>
      <RouterProvider router={router} />
    </CharacterProvider>,
  )
}

describe('NavBarCharacterCard chrome boundary', () => {
  it('renders an ErrorCard with a report link in place of the character card', async () => {
    renderApp()
    expect(await screen.findByText('character-card-crash-for-test')).toBeInTheDocument()
    const reportLink = screen.getByRole('link', { name: 'Report' })
    expect(reportLink).toHaveAttribute('href', expect.stringContaining('ddo-tools'))
  })

  it('keeps the rest of the rail rendered when the character card crashes', async () => {
    renderApp()
    await screen.findByText('character-card-crash-for-test')
    const rail = document.querySelector('.app-nav-bar')
    expect(rail).not.toBeNull()
    for (const label of ['Characters & builds', 'Build plan', 'Gear', 'Resources']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })
})
