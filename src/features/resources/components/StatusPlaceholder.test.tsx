import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { API_HTTP_ERROR, ApiError } from '../../../lib/api'
import { StatusPlaceholder } from './StatusPlaceholder'

describe('StatusPlaceholder', () => {
  it('no-selection renders a select-an-item prompt', () => {
    render(<StatusPlaceholder reason="no-selection" />)
    expect(screen.getByText(/select an item/i)).toBeInTheDocument()
  })

  it('no-results includes the query text and a hint', () => {
    render(<StatusPlaceholder reason="no-results" searchQuery="frce" />)
    expect(screen.getByText(/no matches for "frce"/i)).toBeInTheDocument()
    expect(screen.getByText(/shorter or different search/i)).toBeInTheDocument()
  })

  it('no-results without query falls back to a generic message', () => {
    render(<StatusPlaceholder reason="no-results" />)
    expect(screen.getByText(/^no matches\.$/i)).toBeInTheDocument()
  })

  it('empty-table includes the category', () => {
    render(<StatusPlaceholder reason="empty-table" category="items" />)
    expect(screen.getByText(/no items in database/i)).toBeInTheDocument()
  })

  it('not-found surfaces the missing id', () => {
    render(<StatusPlaceholder reason="not-found" missingItemId={999} />)
    expect(screen.getByText(/no item with id 999/i)).toBeInTheDocument()
    expect(screen.getByText(/pick another row/i)).toBeInTheDocument()
  })

  it('not-found without id falls back to a generic message', () => {
    render(<StatusPlaceholder reason="not-found" />)
    expect(screen.getByText(/^not found\.$/i)).toBeInTheDocument()
  })

  it('makes Retry primary and Report secondary for a server error', () => {
    render(
      <StatusPlaceholder
        error={new ApiError(API_HTTP_ERROR, 500, '500 for /v1/items')}
        path="/v1/items"
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveClass('btn-primary-sm')
    expect(screen.getByRole('link', { name: 'Report a bug' })).toHaveClass('btn-ghost-sm')
  })

  it('makes Report primary for an error on our side', () => {
    render(
      <StatusPlaceholder
        error={new ApiError(API_HTTP_ERROR, 400, '400 for /v1/items')}
        path="/v1/items"
        onRetry={vi.fn()}
      />,
    )
    expect(screen.getByRole('link', { name: 'Report a bug' })).toHaveClass('btn-primary-sm')
    expect(screen.getByRole('button', { name: 'Retry' })).toHaveClass('btn-ghost-sm')
  })
})
