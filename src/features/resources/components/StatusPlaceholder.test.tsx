import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
