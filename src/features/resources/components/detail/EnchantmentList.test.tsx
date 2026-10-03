import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act, fireEvent, within } from '@testing-library/react'
import { HoverCardProvider } from '../../../../components'
import capturedItem from '../../queries/fixtures/item7631.json'
import capturedDualValueItem from '../../queries/fixtures/item483.json'
import capturedAugment from '../../queries/fixtures/augment77.json'
import type { ApiItemDetail } from '../../../../lib/api'
import { toItem } from '../../queries/items'
import { EnchantmentList } from './EnchantmentList'
import type { ItemBonus, ItemEffect } from '../../queries/items'

function bonus(overrides: Partial<ItemBonus> = {}): ItemBonus {
  return {
    id: 1,
    name: 'Charisma +5',
    description: null,
    bonusType: 'Enhancement',
    statName: 'Charisma',
    value: 5,
    value2: null,
    sortOrder: 0,
    ...overrides,
  }
}

function effect(overrides: Partial<ItemEffect> = {}): ItemEffect {
  return {
    id: 1,
    name: 'Bane',
    description: null,
    target: 'Evil Outsider',
    value: 4,
    sortOrder: 0,
    ...overrides,
  }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('shows the captured item bonus value and type in its enchantment card', () => {
  vi.useFakeTimers()
  const item = toItem(capturedItem as ApiItemDetail)
  render(
    <HoverCardProvider>
      <EnchantmentList
        itemName={item.name}
        bonuses={item.bonuses}
        effects={[]}
        modifiers={item.modifiers}
      />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Charisma/ }))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(card).toHaveTextContent('From Stolen Necklace (Level 25)')
  expect(within(card).getByText('+8')).toHaveClass('detail-value-row__value')
  expect(within(card).getByText('Enhancement')).toHaveClass('detail-type-tag')
})

it('shows a second value and API-shaped damage modifier in separate rows', () => {
  vi.useFakeTimers()
  const item = toItem({
    ...(capturedDualValueItem as ApiItemDetail),
    modifiers: [{ ...capturedAugment.modifiers[0], display_name: 'Deception +3' }],
  })
  render(
    <HoverCardProvider>
      <EnchantmentList
        itemName={item.name}
        bonuses={item.bonuses}
        effects={[]}
        modifiers={item.modifiers}
      />
    </HoverCardProvider>,
  )
  fireEvent.mouseEnter(screen.getByRole('row', { name: /Deception/ }))
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(within(card).getByText('+3 / +5')).toHaveClass('detail-value-row__value')
  expect(within(card).getByText('1d6 Electric')).toHaveClass('detail-value-row__value')
})

describe('EnchantmentList', () => {
  it('appends sortable set tiers and highlights a stat without inventing an enchantment name', () => {
    render(
      <EnchantmentList
        bonuses={[bonus({ name: 'Fire Spell Power +77', statName: 'Fire Spell Power', value: 77 })]}
        effects={[]}
        matchingEnchantments={['Fire Spell Power']}
        setDetail={{
          id: 3,
          name: 'Storm Set',
          items: [],
          tiers: [
            {
              equippedCount: 2,
              description: 'Storm tier unlock',
              bonuses: [
                {
                  key: 'bonus-10',
                  name: 'Fire Spell Power',
                  description: 'Fire damage boost',
                  type: 'Artifact',
                  value: 20,
                },
              ],
            },
          ],
        }}
      />,
    )
    expect(screen.getByText('Matches your Enchantments filter')).toBeInTheDocument()
    expect(screen.queryByText(/via /)).toBeNull()
    expect(screen.getByText('+77').closest('[role="row"]')).toHaveClass('ledger-row--highlighted')
    expect(screen.getByText('Storm Set')).toBeInTheDocument()
    expect(screen.getByText('2 pieces').closest('[role="row"]')).toHaveTextContent(
      'Storm tier unlock',
    )
    expect(screen.getByText('2 pieces').closest('[role="row"]')).toHaveClass('ledger-row--heading')
    expect(screen.getByRole('table', { name: 'Enchantments' })).toBeInTheDocument()
  })
  it('renders nothing when there are no bonuses or effects', () => {
    const { container } = render(<EnchantmentList bonuses={[]} effects={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('sorts values descending within each tier while keeping tier headings adjacent', () => {
    render(
      <EnchantmentList
        bonuses={[
          bonus({ id: 1, statName: 'Strength', value: 3 }),
          bonus({ id: 2, statName: 'Dexterity', value: 9 }),
        ]}
        effects={[]}
        setDetail={{
          id: 93,
          name: 'Storm Set',
          items: [],
          tiers: [
            {
              equippedCount: 2,
              description: 'First tier',
              bonuses: [
                { key: 'a', name: 'Melee Power', type: 'Profane', value: 5, description: null },
                {
                  key: 'b',
                  name: 'Healing Amplification',
                  type: 'Profane',
                  value: 10,
                  description: null,
                },
              ],
            },
            {
              equippedCount: 5,
              description: 'Second tier',
              bonuses: [
                {
                  key: 'c',
                  name: 'Universal Spell Power',
                  type: 'Profane',
                  value: 20,
                  description: null,
                },
              ],
            },
          ],
        }}
      />,
    )
    const rows = screen.getAllByRole('row').map((row) => row.textContent)
    expect(rows.slice(1)).toEqual([
      expect.stringContaining('Dexterity'),
      expect.stringContaining('Strength'),
      expect.stringContaining('Storm Set'),
      expect.stringContaining('2 pieces'),
      expect.stringContaining('Healing Amplification'),
      expect.stringContaining('Melee Power'),
      expect.stringContaining('5 pieces'),
      expect.stringContaining('Universal Spell Power'),
    ])
  })

  it('prefixes positive stat bonus values with +', () => {
    render(<EnchantmentList bonuses={[bonus({ value: 5 })]} effects={[]} />)
    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.queryByText('Set')).toBeNull()
  })

  it('renders negative stat bonus values with a single minus sign', () => {
    render(
      <EnchantmentList bonuses={[bonus({ name: 'Constitution -2', value: -2 })]} effects={[]} />,
    )
    expect(screen.getByText('-2')).toBeInTheDocument()
    expect(screen.queryByText('+-2')).toBeNull()
  })

  it('renders a zero-valued stat bonus without a sign', () => {
    render(<EnchantmentList bonuses={[bonus({ value: 0 })]} effects={[]} />)
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.queryByText('+0')).toBeNull()
  })

  it('folds a positive effect value into the effect name with +', () => {
    render(<EnchantmentList bonuses={[]} effects={[effect({ value: 4 })]} />)
    expect(screen.getByText('Bane +4')).toBeInTheDocument()
  })

  it('renders a negative effect value with a single minus sign', () => {
    render(<EnchantmentList bonuses={[]} effects={[effect({ name: 'Curse', value: -3 })]} />)
    expect(screen.getByText('Curse -3')).toBeInTheDocument()
    expect(screen.queryByText('Curse +-3')).toBeNull()
  })

  it('renders bonuses before effects, each with its type chip', () => {
    render(
      <EnchantmentList
        bonuses={[bonus({ bonusType: 'Insight' })]}
        effects={[effect({ target: 'Evil Outsider' })]}
      />,
    )
    expect(screen.getByText('Insight')).toBeInTheDocument()
    expect(screen.getByText('Evil Outsider')).toBeInTheDocument()
  })

  it('omits an empty type tag for an effect without a target', () => {
    const { container } = render(
      <EnchantmentList bonuses={[]} effects={[effect({ target: null })]} />,
    )
    expect(container.querySelector('.detail-type-tag')).toBeNull()
  })

  it('renders an expanded description as its own sub-line', () => {
    render(
      <EnchantmentList
        bonuses={[
          bonus({
            name: 'Fire Resistance +30',
            statName: 'Fire Resistance',
            description: '+30 Enhancement bonus to Fire Resistance',
          }),
        ]}
        effects={[]}
      />,
    )
    expect(screen.getByText('+30 Enhancement bonus to Fire Resistance')).toBeInTheDocument()
  })

  it('omits the sub-line when there is no description', () => {
    const { container } = render(
      <EnchantmentList bonuses={[bonus({ description: null })]} effects={[]} />,
    )
    expect(container.querySelector('.resources-bonus-description')).toBeNull()
  })

  it('omits the sub-line when the description just repeats the name', () => {
    const { container } = render(
      <EnchantmentList
        bonuses={[bonus({ name: 'Charisma +5', description: 'Charisma +5' })]}
        effects={[]}
      />,
    )
    expect(container.querySelector('.resources-bonus-description')).toBeNull()
  })
})
