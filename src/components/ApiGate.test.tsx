import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiGate } from './ApiGate'
import { ApiError, API_NETWORK_ERROR } from '../lib/api'

afterEach(() => {
  cleanup()
})

describe('ApiGate', () => {
  it('shows a skeleton while pending', () => {
    render(
      <ApiGate isPending error={null} onRetry={() => {}}>
        <p>content</p>
      </ApiGate>,
    )
    expect(screen.getByRole('status', { name: /loading game data/i })).toBeInTheDocument()
    expect(screen.queryByText('content')).toBeNull()
  })

  it('renders children once loaded', () => {
    render(
      <ApiGate isPending={false} error={null} onRetry={() => {}}>
        <p>content</p>
      </ApiGate>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('shows a categorized error with a working retry', async () => {
    const onRetry = vi.fn()
    render(
      <ApiGate isPending={false} error={new ApiError(API_NETWORK_ERROR, 0, 'Failed to fetch')} onRetry={onRetry}>
        <p>content</p>
      </ApiGate>,
    )
    expect(screen.getByText(/could not reach the game data api/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
