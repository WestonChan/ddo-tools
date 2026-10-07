import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState, type JSX } from 'react'
import { Combobox, type FilterOption } from './Combobox'
import { HoverCardProvider } from './HoverCard'

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
  shouldPreserveOptionOrder = false,
}: {
  initialValues?: string[]
  pickerOptions?: FilterOption[]
  shouldPreserveOptionOrder?: boolean
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
          shouldPreserveOptionOrder={shouldPreserveOptionOrder}
        />
      )}
    </>
  )
}

function FailedPicker(): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [value, setValue] = useState('')
  return (
    <>
      <button ref={anchorRef}>Slot</button>
      <output>{value}</output>
      <Combobox
        label="Slot"
        anchorRef={anchorRef}
        options={options}
        value={value}
        onChange={setValue}
        searchPlaceholder="Find a slot…"
        onRequestClose={() => {}}
        errorContent={<p>Could not load options</p>}
      />
    </>
  )
}

function RecoveringPicker(): JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [hasFailed, setHasFailed] = useState(true)
  return (
    <>
      <button ref={anchorRef}>Slot</button>
      <Combobox
        label="Slot"
        anchorRef={anchorRef}
        options={options}
        value=""
        onChange={() => {}}
        searchPlaceholder="Find a slot…"
        onRequestClose={() => {}}
        errorContent={
          hasFailed ? (
            <button type="button" onClick={() => setHasFailed(false)}>
              Retry
            </button>
          ) : undefined
        }
      />
    </>
  )
}

function HoverPicker({ isInitiallyOpen = true }: { isInitiallyOpen?: boolean }): React.JSX.Element {
  const anchorRef = useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = useState(isInitiallyOpen)
  return (
    <HoverCardProvider>
      <button ref={anchorRef} data-tip="Choose bonuses" onClick={() => setIsOpen(true)}>
        Bonuses
      </button>
      {isOpen && (
        <Combobox
          label="Bonuses"
          anchorRef={anchorRef}
          options={[
            {
              value: 'Strength',
              label: 'Strength',
              detailPath: '/v1/effects/1',
              children: [{ value: 'Strength:Insight', label: 'Strength · Insight' }],
            },
          ]}
          values={[]}
          onChange={() => {}}
          searchPlaceholder="Stat or enchantment…"
          onRequestClose={() => setIsOpen(false)}
          searchControl={
            <>
              <button type="button">Any</button>
              <button type="button">All</button>
            </>
          }
          extraControl={
            <label>
              <input type="checkbox" />
              Include set bonuses
            </label>
          }
          renderHoverCard={() => <span>Strength detail</span>}
          hoverKind="stat"
        />
      )}
    </HoverCardProvider>
  )
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Combobox', () => {
  it('returns focus to its search input when a failed vocabulary recovers after Retry', async () => {
    render(<RecoveringPicker />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Slot' })).toHaveFocus()
  })
  it('does not activate cached options while showing a failed vocabulary', async () => {
    render(<FailedPicker />)
    const search = screen.getByRole('combobox', { name: 'Slot' })
    expect(search).not.toHaveAttribute('aria-activedescendant')
    expect(screen.queryAllByRole('option')).toHaveLength(0)
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows the first hovered option after leaving the opening chip hint', async () => {
    const user = userEvent.setup()
    render(<HoverPicker isInitiallyOpen={false} />)
    const chip = screen.getByRole('button', { name: 'Bonuses' })
    fireEvent.mouseOver(chip)
    await user.click(chip)
    const option = screen.getByRole('option', { name: 'Strength' })
    fireEvent.mouseEnter(option)
    fireEvent.mouseOut(chip, { relatedTarget: option })
    expect(await screen.findByRole('dialog')).toHaveTextContent('Strength detail')
  })

  it('returns focus to the search field after clearing selected values', async () => {
    render(<MultiPicker initialValues={['back']} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('combobox', { name: 'Bonuses' })).toHaveFocus()
  })

  it('opens an option card only after pointer hover and closes the card before the picker', async () => {
    const user = userEvent.setup()
    render(<HoverPicker />)
    const listbox = screen.getByRole('listbox', { name: 'Bonuses' })
    expect(listbox.querySelectorAll('[tabindex="0"]')).toHaveLength(0)
    expect(listbox.querySelector('button')).toBeNull()
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('option', { name: 'Strength · Insight' })).toBeInTheDocument()
    await user.keyboard('{ArrowLeft}')
    expect(screen.queryByRole('option', { name: 'Strength · Insight' })).toBeNull()
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.hover(screen.getByRole('option', { name: 'Strength' }))
    expect(await screen.findByRole('dialog')).toHaveTextContent('Strength detail')
    expect(screen.getByRole('dialog')).toHaveAttribute('data-kind', 'stat')
    expect(screen.getByRole('combobox', { name: 'Bonuses' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('combobox', { name: 'Bonuses' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('combobox', { name: 'Bonuses' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('button', { name: 'All' }))
    for (
      let index = 0;
      index < 3 && !screen.getByRole('checkbox', { name: 'Include set bonuses' }).matches(':focus');
      index++
    ) {
      await user.tab()
      expect(screen.getByRole('option', { name: 'Strength' })).not.toHaveFocus()
    }
    expect(screen.getByRole('checkbox', { name: 'Include set bonuses' })).toHaveFocus()
  })

  it('places the pointer card beside the menu without intersecting the listbox', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.matches('.combobox-menu')) return new DOMRect(400, 32, 268, 320)
      if (this.matches('.combobox-options')) return new DOMRect(400, 72, 268, 236)
      if (this.matches('.hover-card')) return new DOMRect(0, 0, 300, 180)
      return new DOMRect(0, 0, 100, 28)
    })
    const user = userEvent.setup()
    render(<HoverPicker />)
    await user.hover(screen.getByRole('option', { name: 'Strength' }))
    const card = await screen.findByRole('dialog')
    const listboxRect = screen.getByRole('listbox').getBoundingClientRect()
    await waitFor(() => expect(card.style.left).not.toBe(''))
    const cardLeft = Number.parseFloat(card.style.left)
    expect(cardLeft).toBeGreaterThanOrEqual(676)
    expect(cardLeft >= listboxRect.right || cardLeft + 300 <= listboxRect.left).toBe(true)
  })

  it('hides a pointer card when the user switches to keyboard navigation', async () => {
    const user = userEvent.setup()
    render(<HoverPicker />)
    await user.hover(screen.getByRole('option', { name: 'Strength' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('option', { name: 'Strength · Insight' })).toBeInTheDocument()
  })
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

  it('toggles multiple checks, retains the picker, and counts selected options', async () => {
    render(<MultiPicker />)
    const search = screen.getByRole('combobox', { name: 'Bonuses' })
    await userEvent.type(search, 'Be')
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(document.querySelector('.combobox-footer')).toHaveTextContent('1 of 3 · 0 selected')
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('status')).toHaveTextContent('belt')
    expect(screen.getByRole('combobox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Belt' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.clear(search)
    expect(screen.queryByRole('button', { name: 'Clear Bonuses' })).toBeNull()
    await userEvent.click(screen.getByRole('option', { name: 'Belt' }))
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
    expect(document.querySelector('.combobox-footer')).toHaveTextContent('3 of 3 · 0 selected')
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(screen.getByRole('button', { name: 'Bonuses' })).toHaveFocus()
  })

  it('formats both footer counts for a full vocabulary', () => {
    const vocabulary = Array.from({ length: 2162 }, (_, index) => ({
      value: String(index),
      label: `Bonus ${index}`,
    }))
    render(<MultiPicker pickerOptions={vocabulary} />)
    expect(document.querySelector('.combobox-footer')).toHaveTextContent('2,162 of 2,162')
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

  it('pins a parent whose type was selected when reopening an order-preserving picker', async () => {
    const user = userEvent.setup()
    render(
      <MultiPicker
        initialValues={['Constitution:Insight']}
        shouldPreserveOptionOrder
        pickerOptions={[
          { value: 'Strength', label: 'Strength' },
          {
            value: 'Constitution',
            label: 'Constitution',
            children: [{ value: 'Constitution:Insight', label: 'Constitution · Insight' }],
          },
          { value: 'Vorpal', label: 'Vorpal' },
        ]}
      />,
    )
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Constitution')
    expect(
      screen.getByRole('option', { name: 'Constitution · Insight' }).parentElement,
    ).toHaveClass('combobox-option-wrap--divider')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Constitution')
  })
})
