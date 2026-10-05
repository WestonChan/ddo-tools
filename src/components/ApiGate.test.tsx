import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { ApiGate } from './ApiGate'

afterEach(() => {
  cleanup()
})

describe('ApiGate', () => {
  it('shows a skeleton while pending', () => {
    render(
      <ApiGate isPending>
        <p>content</p>
      </ApiGate>,
    )
    expect(screen.getByRole('status', { name: /loading game data/i })).toBeInTheDocument()
    expect(screen.queryByText('content')).toBeNull()
  })

  it('renders children once loaded', () => {
    render(
      <ApiGate isPending={false}>
        <p>content</p>
      </ApiGate>,
    )
    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
