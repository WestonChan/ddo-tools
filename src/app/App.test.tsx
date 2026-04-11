import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { CharacterProvider } from '../features/character'

// Mock useDatabase so LoadingGate doesn't block rendering
vi.mock('../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: {}, loading: false, error: null }),
}))

function renderApp() {
  return render(
    <CharacterProvider>
      <App />
    </CharacterProvider>,
  )
}

describe('App', () => {
  it('renders the sidebar with navigation', () => {
    renderApp()
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(5)
  })

  it('renders placeholder content for default view', () => {
    renderApp()
    expect(screen.getByText(/Build Plan coming/)).toBeInTheDocument()
  })

  it('renders the stats sidebar on build-plan view', () => {
    renderApp()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Feats')).toBeInTheDocument()
  })
})
