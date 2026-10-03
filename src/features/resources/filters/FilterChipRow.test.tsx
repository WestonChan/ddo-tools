import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, useState } from 'react'
import { FilterChipRow } from './FilterChipRow'
import type { FilterDefinition, NumericRange } from './filterModel'

interface TestFilterValues {
  ml: NumericRange
  slot: string
  enchantments: string[]
  isRareOnly: boolean
  isRaidOnly: boolean
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
    label: 'Gear slot',
    kind: 'single',
    options: [
      { value: 'Back', label: 'Back' },
      { value: 'Ring', label: 'Ring' },
    ],
    searchPlaceholder: 'Find a slot…',
  },
  {
    key: 'enchantments',
    label: 'Enchantments',
    kind: 'multi',
    options: [
      { value: 'Strength', label: 'Strength' },
      { value: 'Constitution', label: 'Constitution' },
    ],
    searchPlaceholder: 'Bonus or enchantment…',
  },
  { key: 'isRareOnly', label: 'Rare only', kind: 'toggle', appliedGroupLabel: 'Show' },
  { key: 'isRaidOnly', label: 'Raid only', kind: 'toggle', appliedGroupLabel: 'Show' },
]

function Row(): React.JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null)
  const [values, setValues] = useState<TestFilterValues>({
    ml: { min: '', max: '' },
    slot: '',
    enchantments: [],
    isRareOnly: false,
    isRaidOnly: false,
  })
  return (
    <>
      <input ref={searchRef} aria-label="Search" />
      <FilterChipRow
        definitions={definitions}
        values={values}
        onChange={setValues}
        onClearAll={() =>
          setValues({
            ml: { min: '', max: '' },
            slot: '',
            enchantments: [],
            isRareOnly: false,
            isRaidOnly: false,
          })
        }
        focusFallbackRef={searchRef}
      />
    </>
  )
}

afterEach(cleanup)

describe('FilterChipRow', () => {
  it('opens a picker, shows an applied value, removes only that value, and clears all', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'Gear slot' }))
    await userEvent.click(screen.getByRole('option', { name: 'Back' }))
    const slotChip = screen.getByRole('button', { name: 'Gear slot' })
    expect(slotChip).toHaveClass('filter-chip--selected')
    expect(slotChip).toHaveAttribute('data-tip', 'Gear slot: Back')
    expect(
      slotChip.closest('.filter-chip-wrap')?.querySelector('.filter-chip-badge'),
    ).toHaveTextContent('1')
    await userEvent.click(screen.getByRole('button', { name: /Rare only/ }))
    await userEvent.click(screen.getByRole('button', { name: /Show applied · 2/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gear slot: Back' }))
    expect(screen.getByRole('button', { name: 'Gear slot' })).not.toHaveClass(
      'filter-chip--selected',
    )
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
    const chip = screen.getByRole('button', { name: 'Gear slot' })
    await userEvent.click(chip)
    expect(screen.getByRole('combobox', { name: 'Gear slot' })).toHaveFocus()
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
    await userEvent.click(screen.getByRole('button', { name: 'Gear slot' }))
    expect(screen.getByRole('button', { name: '≥ 12' })).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: '≥ 12' }))
    await userEvent.clear(screen.getByRole('spinbutton', { name: 'Min ML' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '20{Escape}')
    expect(screen.getByRole('button', { name: '≥ 12' })).toBeInTheDocument()
  })

  it('moves focus to the next applied value, then search after the last value or Clear filters', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'Gear slot' }))
    await userEvent.click(screen.getByRole('option', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show applied · 2' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove Gear slot: Back' }))
    expect(screen.getByRole('button', { name: 'Remove Rare only: Rare only' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Remove Rare only: Rare only' }))
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus()
  })

  it('keeps the multi label, shows its count in a badge, and renders removable applied pills', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'Enchantments' }))
    await userEvent.click(screen.getByRole('option', { name: 'Strength' }))
    await userEvent.click(screen.getByRole('option', { name: 'Constitution' }))
    const chip = screen.getByRole('button', { name: 'Enchantments' })
    expect(chip).toHaveAttribute('data-tip', 'Enchantments: Strength, Constitution')
    expect(
      chip.closest('.filter-chip-wrap')?.querySelector('.filter-chip-badge'),
    ).toHaveTextContent('2')
    expect(chip).not.toHaveTextContent('· 2')
    await userEvent.click(screen.getByRole('button', { name: 'Show applied · 2' }))
    const pill = screen.getByRole('button', { name: 'Remove Enchantments: Strength' })
    expect(pill).toHaveClass('filter-applied-value')
    expect(pill.querySelector('.filter-applied-value-remove')).toBeInTheDocument()
  })

  it('shows one ML pill and groups both toggles under Show', async () => {
    render(<Row />)
    await userEvent.click(screen.getByRole('button', { name: 'ML' }))
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '20')
    await userEvent.type(screen.getByRole('spinbutton', { name: 'Max ML' }), '32{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Show applied · 3' }))
    const groups = document.querySelectorAll('.filter-applied-group')
    expect(groups).toHaveLength(2)
    expect(groups[0].querySelector('.filter-applied-label')).toHaveTextContent('ML')
    expect(groups[0].querySelectorAll('.filter-applied-value')).toHaveLength(1)
    expect(groups[0].querySelector('.filter-applied-value')).toHaveTextContent('20–32')
    expect(groups[1].querySelector('.filter-applied-label')).toHaveTextContent('Show')
    expect(groups[1].querySelectorAll('.filter-applied-value')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Remove ML: 20–32' }))
    expect(screen.getByRole('button', { name: 'ML' })).not.toHaveClass('filter-chip--selected')
    expect(screen.getByRole('button', { name: 'Hide applied' })).toBeInTheDocument()
  })
})
