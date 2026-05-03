import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorScreen } from './ErrorScreen'

describe('ErrorScreen', () => {
  it('renders heading and the role="alert" landmark', () => {
    render(<ErrorScreen heading="Something went wrong" error={new Error('boom')} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeInTheDocument()
  })

  it('does not auto-focus anything on mount (role="alert" handles SR announcement)', () => {
    render(
      <ErrorScreen
        heading="X"
        error={new Error('y')}
        actions={
          <>
            <button>Primary</button>
            <button>Secondary</button>
          </>
        }
      />,
    )
    // Neither the heading nor the action buttons should be focused.
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus()
    expect(screen.getByRole('button', { name: 'Primary' })).not.toHaveFocus()
    expect(screen.getByRole('button', { name: 'Secondary' })).not.toHaveFocus()
  })

  it('renders error.message in the detail block when no body is provided', () => {
    render(<ErrorScreen heading="Boom" error={new Error('inside the engine')} />)
    expect(screen.getByText('inside the engine')).toBeInTheDocument()
  })

  it('renders a custom body in place of the error detail', () => {
    render(
      <ErrorScreen
        heading="Page not found"
        body="/missing/path"
        tone="info"
      />,
    )
    expect(screen.getByText('/missing/path')).toBeInTheDocument()
    // No monospace error-detail block when body is provided
    const detail = document.querySelector('.error-screen-detail')
    expect(detail).toBeNull()
  })

  it('renders hint when provided', () => {
    render(<ErrorScreen heading="Boom" error={new Error('x')} hint="check your connection" />)
    expect(screen.getByText('check your connection')).toBeInTheDocument()
  })

  it('renders action buttons in a row', () => {
    render(
      <ErrorScreen
        heading="Boom"
        error={new Error('x')}
        actions={
          <>
            <button>Retry</button>
            <button>Reset</button>
          </>
        }
      />,
    )
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
  })

  it('renders a labeled "known issue" search link plus a report link when labels are provided', () => {
    render(<ErrorScreen heading="Failed" error={new Error('boom')} labels="db-loading" />)
    const knownIssue = screen.getByRole('link', { name: 'known issue' })
    const reportIt = screen.getByRole('link', { name: 'report it' })
    expect(knownIssue).toHaveAttribute('href', expect.stringContaining('label%3Adb-loading'))
    expect(reportIt).toHaveAttribute('href', expect.stringContaining('labels=db-loading'))
  })

  it('renders only "Report this issue" (no search link) when no labels are provided', () => {
    render(<ErrorScreen heading="Failed" error={new Error('boom')} />)
    expect(screen.queryByRole('link', { name: 'known issue' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Report this issue' })).toBeInTheDocument()
  })

  it('does not render any report link when neither error nor labels are provided', () => {
    render(<ErrorScreen heading="Page not found" body="/x" tone="info" />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('applies the info modifier class when tone is info', () => {
    const { container } = render(
      <ErrorScreen heading="Page not found" body="/x" tone="info" />,
    )
    expect(container.querySelector('.error-screen--info')).not.toBeNull()
  })

  it('does NOT apply the info modifier class for tone="error" (default)', () => {
    const { container } = render(<ErrorScreen heading="Boom" error={new Error('x')} />)
    expect(container.querySelector('.error-screen--info')).toBeNull()
  })

  it('accepts an array of labels for the report links', () => {
    render(<ErrorScreen heading="X" error={new Error('y')} labels={['runtime', 'not-found']} />)
    const knownIssue = screen.getByRole('link', { name: 'known issue' })
    expect(knownIssue).toHaveAttribute('href', expect.stringContaining('label%3Aruntime'))
    expect(knownIssue).toHaveAttribute('href', expect.stringContaining('label%3Anot-found'))
  })
})
