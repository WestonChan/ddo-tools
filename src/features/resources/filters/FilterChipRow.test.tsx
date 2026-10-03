import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { FilterChipRow } from './FilterChipRow'
import type { FilterDefinition, NumericRange } from './filterModel'

interface TestFilterValues {
  ml: NumericRange
  slot: string
  isRareOnly: boolean
}

const definitions: FilterDefinition<TestFilterValues>[] = [
  {
    key: 'ml',
    label: 'ML',
    kind: 'range',
    range: {
      minLabel: 'Min ML',
      maxLabel: 'Max ML',
      minimum: 1,
      maximum: 36,
      minPlaceholder: '1',
      maxPlaceholder: '36',
      hint: 'Either bound can be blank.',
    },
  },
  {
    key: 'slot',
    label: 'Slot',
    kind: 'single',
    options: [
      { value: 'Back', label: 'Back' },
      { value: 'Ring', label: 'Ring' },
    ],
    searchPlaceholder: 'Find a slot…',
  },
  { key: 'isRareOnly', label: 'Rare only', kind: 'toggle' },
]

function Row(): React.JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState<TestFilterValues>({
    ml: { min: '', max: '' },
    slot: '',
    isRareOnly: false,
  })
  return (
    <>
      <input ref={searchRef} aria-label="Search" />
      <FilterChipRow
        definitions={definitions}
        values={values}
        onChange={setValues}
        onClearAll={() => setValues({ ml: { min: '', max: '' }, slot: '', isRareOnly: false })}
        focusFallbackRef={searchRef}
      />
    </>
  )
}

afterEach(cleanup)

describe('FilterChipRow', () => {
  it('opens a picker, shows an applied value, removes only that value, and clears all', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'Slot' }))
    await userEvent.click(screen.getByRole('option', { name: 'Back' }))
    expect(screen.getByRole('button', { name: /Slot · Back/ })).toHaveClass('filter-chip--selected')
    await userEvent.click(screen.getByRole('button', { name: /Rare only/ }))
    await userEvent.click(screen.getByRole('button', { name: /Show applied · 2/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Slot: Back' }))
    expect(screen.getByRole('button', { name: 'Slot' })).not.toHaveClass('filter-chip--selected')
    expect(screen.getByRole('button', { name: 'Rare only' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('button', { name: 'Rare only' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('clears both ML bounds from the chip clear control', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'ML' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '20')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Max ML' }), '32{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Clear ML' }))
    expect(screen.getByRole('button', { name: 'ML' })).not.toHaveClass('filter-chip--selected')
  })

  it('closes a picker from its chip and returns focus there', async () => {
    render(<Row />)
    const chip = screen.getByRole('button', { name: 'Slot' })
    await userEvent.click(chip)
    expect(screen.getByRole('combobox', { name: 'Slot' })).toHaveFocus()
    await userEvent.click(chip)
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(chip).toHaveFocus()
  })

  it('commits the ML draft on outside click or switching chips and discards it on Escape', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'ML' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '510')
    await userEvent.click(document.body)
    expect(screen.getByRole('button', { name: '≥ 36' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '≥ 36' }))
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Min ML' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '12')
    await userEvent.click(screen.getByRole('button', { name: 'Slot' }))
    expect(screen.getByRole('button', { name: '≥ 12' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: '≥ 12' }))
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Min ML' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '20{Escape}')
    expect(screen.getByRole('button', { name: '≥ 12' })).toBeInTheDocument()
  })

  it('moves focus to the next applied value, then search after the last value or Clear filters', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'Slot' }))
    await userEvent.click(screen.getByRole('option', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show applied · 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Slot: Back' }))
    expect(screen.getByRole('button', { name: 'Remove Rare only: Rare only' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Rare only: Rare only' }))
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
  })
})
