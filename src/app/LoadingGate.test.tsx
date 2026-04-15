import { render, screen } from '@testing-library/react'
import { LoadingGate } from './LoadingGate'

// Mock useDatabase hook
vi.mock('../hooks', async () => {
  const actual = await vi.importActual('../hooks')
  return { ...actual, useDatabase: vi.fn() }
})

import { useDatabase } from '../hooks'
const mockUseDatabase = vi.mocked(useDatabase)

describe('LoadingGate', () => {
  it('shows loading skeleton while DB loads', () => {
    mockUseDatabase.mockReturnValue({ db: null, loading: true, error: null })

    const { container } = render(
      <LoadingGate>
        <div>App content</div>
      </LoadingGate>,
    )

    expect(container.querySelector('.loading-gate-skeleton')).toBeInTheDocument()
    expect(screen.queryByText('App content')).not.toBeInTheDocument()
  })

  it('shows error screen with retry when DB fails', () => {
    mockUseDatabase.mockReturnValue({
      db: null,
      loading: false,
      error: new Error('WASM not supported'),
    })

    render(
      <LoadingGate>
        <div>App content</div>
      </LoadingGate>,
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('WASM not supported')).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
    expect(screen.getByText('Clear Cached Data & Retry')).toBeInTheDocument()
    expect(screen.queryByText('App content')).not.toBeInTheDocument()
  })

  it('renders children when DB is loaded', () => {
    mockUseDatabase.mockReturnValue({ db: {} as never, loading: false, error: null })

    render(
      <LoadingGate>
        <div>App content</div>
      </LoadingGate>,
    )

    expect(screen.getByText('App content')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })
})
