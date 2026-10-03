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

function MultiPicker({
  initialValues = [],
  pickerOptions = options,
}: {
  initialValues?: string[]
  pickerOptions?: typeof options
}): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [values, setValues] = useState<string[]>(initialValues)
  const [isOpen, setIsOpen] = useState(true)
  return (
    <>
      <button ref={anchorRef} onClick={() => setIsOpen(true)}>
        Bonuses
      </button>
      <output>{values.join(',')}</output>
      {isOpen && (
        <Combobox
          label="Bonuses"
          anchorRef={anchorRef}
          options={pickerOptions}
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

  it('toggles multiple checks, retains the picker, and has no footer', async () => {
    render(<MultiPicker />)
    const search = screen.getByRole('combobox', { name: 'Bonuses' })
    await userEvent.type(search, 'Be')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(document.querySelector('.combobox-footer')).toBeNull()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('belt')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Belt' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.clear(search)
    expect(screen.queryByRole('button', { name: 'Clear Bonuses' })).toBeNull()
    await userEvent.click(screen.getByRole('option', { name: 'Belt' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(document.querySelector('.combobox-footer')).toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Bonuses' })).toHaveFocus()
  })

  it('places selections from opening first and keeps option rows fixed until reopening', async () => {
    const user = userEvent.setup()
    render(<MultiPicker initialValues={['body', 'back']} />)
    const optionLabels = (): string[] =>
      screen.getAllByRole('option').map((option) => option.textContent ?? '')
    expect(optionLabels()).toEqual(['Back', 'Body', 'Belt'])
    expect(screen.getByRole('option', { name: 'Body' }).parentElement).toHaveClass(
      'combobox-option-wrap--divider',
    )
    expect(screen.getByRole('option', { name: 'Back' }).parentElement).not.toHaveClass(
      'combobox-option-wrap--divider',
    )
    const search = screen.getByRole('combobox', { name: 'Bonuses' })
    await user.type(search, 'be')
    expect(optionLabels()).toEqual(['Belt'])
    expect(screen.getByRole('option', { name: 'Belt' }).parentElement).not.toHaveClass(
      'combobox-option-wrap--divider',
    )
    await user.clear(search)
    await user.click(screen.getByRole('option', { name: 'Belt' }))
    expect(optionLabels()).toEqual(['Back', 'Body', 'Belt'])
    expect(screen.getByRole('option', { name: 'Body' }).parentElement).toHaveClass(
      'combobox-option-wrap--divider',
    )
    expect(screen.getByRole('option', { name: 'Belt' })).toHaveAttribute('aria-selected', 'true')
    await user.type(search, 'bo')
    expect(optionLabels()).toEqual(['Body'])
    expect(screen.getByRole('option', { name: 'Body' }).parentElement).not.toHaveClass(
      'combobox-option-wrap--divider',
    )
    await user.clear(search)
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(optionLabels()).toEqual(['Back', 'Belt', 'Body'])
    expect(document.querySelector('.combobox-option-wrap--divider')).toBeNull()
  })

  it('omits the divider when no options were pinned or every visible option was pinned', () => {
    const view = render(<MultiPicker />)
    expect(document.querySelector('.combobox-option-wrap--divider')).toBeNull()
    view.unmount()
    render(<MultiPicker initialValues={['back', 'belt', 'body']} />)
    expect(document.querySelector('.combobox-option-wrap--divider')).toBeNull()
  })

  it('pins an existing selection when vocabulary options arrive after opening', () => {
    const view = render(<MultiPicker initialValues={['body']} pickerOptions={[]} />)
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    view.rerender(<MultiPicker initialValues={['body']} pickerOptions={options} />)
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'Body',
      'Back',
      'Belt',
    ])
    expect(screen.getByRole('option', { name: 'Body' }).parentElement).toHaveClass(
      'combobox-option-wrap--divider',
    )
  })
})
