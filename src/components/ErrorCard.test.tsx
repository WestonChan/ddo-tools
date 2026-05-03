import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorCard } from './ErrorCard'

describe('ErrorCard', () => {
  it('renders the error message', () => {
    render(<ErrorCard error={new Error('boom')} />)
    expect(screen.getByText('boom')).toBeInTheDocument()
  })

  it('uses role="status" with aria-live="polite" (not role="alert") to avoid cascade noise', () => {
    render(<ErrorCard error={new Error('x')} />)
    const card = screen.getByRole('status')
    expect(card).toHaveAttribute('aria-live', 'polite')
    expect(card).not.toHaveAttribute('role', 'alert')
  })

  it('renders a Report link pointing at the ddo-tools repo new-issue URL', () => {
    render(<ErrorCard error={new Error('x')} />)
    const link = screen.getByRole('link', { name: 'Report' })
    expect(link).toHaveAttribute('href', expect.stringContaining('github.com/WestonChan/ddo-tools'))
    expect(link).toHaveAttribute('href', expect.stringContaining('issues/new'))
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('encodes the labels prop into the new-issue URL', () => {
    render(<ErrorCard error={new Error('x')} labels="runtime" />)
    const link = screen.getByRole('link', { name: 'Report' })
    expect(link).toHaveAttribute('href', expect.stringContaining('labels=runtime'))
  })

  it('uses context as the issue title when provided', () => {
    render(<ErrorCard error={new Error('x')} context="patch-notes-2026-04-27" />)
    const link = screen.getByRole('link', { name: 'Report' })
    expect(link).toHaveAttribute(
      'href',
      expect.stringContaining('title=patch-notes-2026-04-27'),
    )
  })
})
