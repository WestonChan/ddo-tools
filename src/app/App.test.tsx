import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'
import { CharacterProvider } from '../features/character'

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
    // Sidebar renders with nav buttons (collapsed shows icons only)
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(5)
  })

  it('renders collapsible sections', () => {
    renderApp()
    expect(screen.getByText('Level Plan')).toBeInTheDocument()
    expect(screen.getByText('Gear')).toBeInTheDocument()
    expect(screen.getByText('Enhancements')).toBeInTheDocument()
    expect(screen.getByText('Epic Destinies')).toBeInTheDocument()
  })

  it('renders the stats sidebar', () => {
    renderApp()
    expect(screen.getByText('Stats')).toBeInTheDocument()
    expect(screen.getByText('Feats')).toBeInTheDocument()
  })
})
