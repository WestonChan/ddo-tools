import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { EditableText } from './EditableText'

describe('EditableText', () => {
  it('renders value text in display mode', () => {
    render(<EditableText text="My Build" onCommit={vi.fn()} />)
    expect(screen.getByText('My Build')).toBeInTheDocument()
  })

  it('renders placeholder when value is empty', () => {
    render(<EditableText text="" placeholder="Name..." onCommit={vi.fn()} />)
    expect(screen.getByText('Name...')).toBeInTheDocument()
    expect(screen.getByText('Name...')).toHaveClass('editable-text-placeholder')
  })

  it('switches to input on click', () => {
    render(<EditableText text="My Build" onCommit={vi.fn()} />)
    fireEvent.click(screen.getByText('My Build'))
    const input = screen.getByDisplayValue('My Build')
    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe('INPUT')
  })

  it('commits on Enter with trimmed value', () => {
    const onCommit = vi.fn()
    render(<EditableText text="Old" onCommit={onCommit} />)
    fireEvent.click(screen.getByText('Old'))
    const input = screen.getByDisplayValue('Old')
    fireEvent.change(input, { target: { value: '  New Value  ' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onCommit).toHaveBeenCalledWith('New Value')
  })

  it('reverts on Escape', () => {
    const onCommit = vi.fn()
    render(<EditableText text="Original" onCommit={onCommit} />)
    fireEvent.click(screen.getByText('Original'))
    const input = screen.getByDisplayValue('Original')
    fireEvent.change(input, { target: { value: 'Changed' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onCommit).not.toHaveBeenCalled()
    expect(screen.getByText('Original')).toBeInTheDocument()
  })

  it('commits on blur', () => {
    const onCommit = vi.fn()
    render(<EditableText text="Start" onCommit={onCommit} />)
    fireEvent.click(screen.getByText('Start'))
    const input = screen.getByDisplayValue('Start')
    fireEvent.change(input, { target: { value: 'Blurred' } })
    fireEvent.blur(input)
    expect(onCommit).toHaveBeenCalledWith('Blurred')
  })

  it('click does not bubble to parent (enters edit mode)', () => {
    const parentClickListener = vi.fn()
    const onCommit = vi.fn()
    render(
      <div onClick={parentClickListener}>
        <EditableText text="Test" onCommit={onCommit} />
      </div>,
    )
    fireEvent.click(screen.getByText('Test'))
    expect(parentClickListener).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('Test')).toBeInTheDocument()

    const input = screen.getByDisplayValue('Test')
    fireEvent.click(input)
    expect(parentClickListener).not.toHaveBeenCalled()
  })
})
