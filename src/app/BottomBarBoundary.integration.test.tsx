import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RouterProvider, createMemoryHistory } from '@tanstack/react-router'
import { CharacterProvider } from '../features/character'
import { createAppRouter } from '../router'

vi.mock('./BottomBar', () => ({
  BottomBar: function ThrowingBottomBar(): never {
    throw new Error('bottom-bar-crash-for-test')
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

describe('BottomBar chrome boundary', () => {
  it('renders ErrorCard in place of the bottom bar when BottomBar throws', async () => {
    renderApp()
    expect(await screen.findByText('bottom-bar-crash-for-test')).toBeInTheDocument()
    const reportLink = screen.getByRole('link', { name: 'Report' })
    expect(reportLink).toHaveAttribute('href', expect.stringContaining('ddo-tools'))
  })

  it('keeps the rest of the shell rendered when BottomBar crashes', async () => {
    renderApp()
    expect(await screen.findByText('bottom-bar-crash-for-test')).toBeInTheDocument()
    expect(document.querySelector('.app-nav-bar')).not.toBeNull()
  })
})
