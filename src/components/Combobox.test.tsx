import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { Combobox } from './Combobox'

const options = [
  { value: 'back', label: 'Back' },
  { value: 'belt', label: 'Belt' },
  { value: 'body', label: 'Body' },
]

function SinglePicker(): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [value, setValue] = useState('')
  return (
    <>
      <button ref={anchorRef} onClick={() => setIsOpen(true)}>
        Slot
      </button>
      <output>{value}</output>
      {isOpen && (
        <Combobox
          label="Slot"
          anchorRef={anchorRef}
          options={options}
          value={value}
          onChange={setValue}
          searchPlaceholder="Find a slot…"
          onRequestClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

function MultiPicker(): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [values, setValues] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <button ref={anchorRef}>Bonuses</button>
      <output>{values.join(',')}</output>
      {isOpen && (
        <Combobox
          label="Bonuses"
          anchorRef={anchorRef}
          options={options}
          values={values}
          onChange={setValues}
          searchPlaceholder="Find a bonus…"
          onRequestClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

afterEach(cleanup)

describe('Combobox', () => {
  it('filters without case sensitivity, wraps the highlight, and closes after a single pick', async () => {
    render(<SinglePicker />)
    const search = screen.getByRole('combobox', { name: 'Slot' })
    expect(search).toHaveFocus()
    expect(search).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await userEvent.type(search, 'B')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    await userEvent.keyboard('{ArrowUp}{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('body')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Slot' })).toHaveFocus()
  })

  it('wraps ArrowDown and closes on an outside mousedown', async () => {
    render(<SinglePicker />)
    const search = screen.getByRole('combobox', { name: 'Slot' })
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}')
    expect(search).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id)
    await userEvent.click(document.body)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('toggles multiple checks, retains the picker, and clears only its values', async () => {
    render(<MultiPicker />)
    const search = screen.getByRole('combobox', { name: 'Bonuses' })
    await userEvent.type(search, 'Be')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('belt')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Belt' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Clear Bonuses' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Bonuses' })).toHaveFocus()
  })
})
