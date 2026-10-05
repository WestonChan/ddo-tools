import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, act, fireEvent, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HoverCardProvider } from '../../../../components'
import capturedItem from '../../queries/fixtures/item7631.json'
import capturedDualValueItem from '../../queries/fixtures/item483.json'
import capturedAugment from '../../queries/fixtures/augment77.json'
import capturedRing from '../../queries/fixtures/item487.json'
import capturedRuneArm from '../../queries/fixtures/item924.json'
import capturedSet from '../../queries/fixtures/set93.json'
import type { ApiItemDetail } from '../../../../lib/api'
import { renderWithRouter } from '../../../../test/renderWithRouter'
import { toItem } from '../../queries/items'
import { toSetDetail } from '../../queries/sets'
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
  vi.unstubAllGlobals()
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
  const row = screen.getByRole('row', { name: /Charisma/ })
  fireEvent.mouseEnter(row)
  act(() => vi.advanceTimersByTime(120))
  const card = screen.getByRole('dialog')
  expect(row).not.toHaveAttribute('data-hover-card-pinned')
  fireEvent.keyDown(document, { key: 't' })
  expect(row).toHaveAttribute('data-hover-card-pinned')
  fireEvent.mouseDown(card)
  fireEvent.click(card)
  fireEvent.mouseLeave(row)
  expect(row).toHaveAttribute('data-hover-card-pinned')
  expect(card).toHaveTextContent('From Stolen Necklace (Level 25)')
  expect(within(card).getByText('+8')).toHaveClass('detail-value-row__value')
  expect(within(card).getByText('Enhancement')).toHaveClass('detail-value-row__type')
  expect(card.querySelector('.detail-type-tag')).toBeNull()
  expect(screen.queryByRole('heading', { name: 'Enchantments' })).toBeNull()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(row).not.toHaveAttribute('data-hover-card-pinned')
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

it('shows hover variant enchantment columns without a section heading', () => {
  render(
    <HoverCardProvider>
      <EnchantmentList bonuses={[bonus()]} effects={[]} variant="hover" />
    </HoverCardProvider>,
  )
  expect(screen.getByText('Charisma')).toBeInTheDocument()
  expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
    'Type',
    'Enchantment',
    'Value',
  ])
  expect(screen.getByText('Charisma').closest('[role="row"]')).toHaveTextContent(
    'EnhancementCharisma+5',
  )
  expect(screen.getByText('Enhancement')).toHaveClass('resources-bonus-type')
  expect(screen.getByText('Enhancement')).not.toHaveClass('detail-type-tag')
  expect(screen.queryByRole('heading', { name: 'Enchantments' })).toBeNull()
})

describe('EnchantmentList', () => {
  it('puts the enhancement bonus in the first sortable row without filter tint', () => {
    render(
      <EnchantmentList
        bonuses={[]}
        effects={[]}
        enhancementBonus={5}
        matchingEnchantments={['Enhancement Bonus']}
      />,
    )
    expect(screen.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Type',
      'Enchantment',
      'Value',
    ])
    const row = screen.getByRole('row', { name: /Enhancement Bonus/ })
    expect(row).toHaveTextContent('Enhancement')
    expect(row).toHaveTextContent('+5')
    expect(row).not.toHaveClass('ledger-row--highlighted')
  })

  it('focuses its first row, includes set headings, skips tiers, and returns from a pinned bonus card', () => {
    vi.useFakeTimers()
    const item = toItem(capturedRing as ApiItemDetail)
    const set = toSetDetail(capturedSet)
    const onOpenItem = vi.fn()
    render(
      <HoverCardProvider>
        <EnchantmentList
          itemName={item.name}
          bonuses={item.bonuses}
          effects={item.effects}
          setDetail={set}
          onOpenItem={onOpenItem}
        />
      </HoverCardProvider>,
    )
    const body = document.querySelector<HTMLElement>('.ledger-plain-body')!
    const rows = screen.getAllByRole('row').filter((row) => row.classList.contains('ledger-row'))
    expect(body).not.toHaveAttribute('tabindex')
    expect(rows.filter((row) => row.tabIndex === 0)).toHaveLength(1)
    act(() => rows[0].focus())
    expect(rows[0]).toHaveFocus()
    act(() => vi.advanceTimersByTime(120))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(rows[0], { key: 't' })
    act(() => vi.runOnlyPendingTimers())
    expect(rows[0]).toHaveAttribute('data-hover-card-pinned')
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(rows[0]).toHaveFocus()
    fireEvent.keyDown(rows[0], { key: 'End' })
    const setHeading = screen.getByText(set.name).closest('[role="row"]')!
    expect(setHeading).toHaveFocus()
    expect(setHeading).toHaveAttribute('aria-expanded', 'false')
    fireEvent.keyDown(setHeading, { key: 'Enter' })
    expect(setHeading).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(setHeading, { key: 'End' })
    const lastBonus = screen.getAllByRole('row').at(-1)!
    expect(lastBonus).toHaveFocus()
    expect(lastBonus).not.toHaveClass('ledger-row--subheading')
    fireEvent.keyDown(lastBonus, { key: 'Enter' })
    expect(onOpenItem).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(120))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(lastBonus, { key: 'Escape' })
    expect(lastBonus).toHaveFocus()
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.keyDown(lastBonus, { key: 'Escape' })
    expect(lastBonus).toHaveFocus()
  })

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
    const setHeading = screen.getByText('Storm Set').closest('[role="row"]')
    expect(setHeading).toHaveClass('ledger-row--heading')
    expect(setHeading).toHaveTextContent('Set')
    expect(setHeading).toHaveTextContent('1 bonus')
    expect(setHeading).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('2 pieces')).toBeNull()
    fireEvent.click(setHeading!)
    expect(setHeading).toHaveTextContent('Hide')
    expect(setHeading).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('2 pieces').closest('[role="row"]')).toHaveClass(
      'ledger-row--subheading',
    )
    expect(
      screen
        .getAllByText('Fire Spell Power', { selector: '.resources-bonus-name' })[1]
        .closest('[role="row"]'),
    ).toHaveTextContent('ArtifactFire Spell Power+20')
    expect(screen.queryByText('Storm tier unlock')).toBeNull()
    expect(screen.queryByText('Fire damage boost')).toBeNull()
    expect(screen.getByRole('table', { name: 'Enchantments' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Enchantment' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Enchantments' })).toBeNull()
  })

  it.each([capturedRing, capturedRuneArm])(
    'bands the captured set after the enchantments on item $id',
    (capturedItem) => {
      const item = toItem(capturedItem as ApiItemDetail)
      const set = toSetDetail(capturedSet)
      render(<EnchantmentList bonuses={item.bonuses} effects={item.effects} setDetail={set} />)
      const rows = screen.getAllByRole('row').slice(1)
      const headingIndex = rows.findIndex((row) => row.textContent?.includes(set.name))
      expect(headingIndex).toBe(item.bonuses.length + item.effects.length)
      expect(rows[headingIndex]).toHaveClass('ledger-row--heading')
      expect(rows[headingIndex]).toHaveTextContent('Set')
      expect(rows[headingIndex]).toHaveTextContent('7 bonuses')
      expect(rows.slice(headingIndex + 1)).toHaveLength(0)
      fireEvent.click(rows[headingIndex])
      const expandedRows = screen.getAllByRole('row').slice(headingIndex + 2)
      expect(expandedRows[0]).toHaveClass('ledger-row--subheading')
      expect(expandedRows[0]).toHaveTextContent('5 pieces')
      expect(expandedRows[1]).toHaveTextContent('ProfanePhysical Resistance Rating+5')
      expect(screen.queryByText(set.tiers[0].description!)).toBeNull()
      expect(expandedRows.slice(1)).toHaveLength(7)
    },
  )
  it('renders nothing when there are no bonuses or effects', () => {
    const { container } = render(<EnchantmentList bonuses={[]} effects={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows no set band without a set and omits the band from the item hover variant', () => {
    const item = toItem(capturedRing as ApiItemDetail)
    const set = toSetDetail(capturedSet)
    const view = render(<EnchantmentList bonuses={item.bonuses} effects={item.effects} />)
    expect(view.container.querySelector('.ledger-row--heading')).toBeNull()
    view.rerender(
      <EnchantmentList
        bonuses={item.bonuses}
        effects={item.effects}
        setDetail={set}
        variant="hover"
      />,
    )
    expect(screen.queryByText(set.name)).toBeNull()
    expect(view.container.querySelector('.resources-set-heading')).toBeNull()
  })

  it('opens in the item order and sorts values descending within each tier on a header click', () => {
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
    const rowTexts = (): (string | null)[] =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => row.textContent)
    expect(rowTexts()).toEqual([
      expect.stringContaining('Strength'),
      expect.stringContaining('Dexterity'),
      expect.stringContaining('Storm Set'),
    ])
    expect(screen.getByText('Storm Set').closest('[role="row"]')).toHaveTextContent('3 bonuses')
    fireEvent.click(screen.getByText('Storm Set').closest('[role="row"]')!)
    expect(rowTexts()).toEqual([
      expect.stringContaining('Strength'),
      expect.stringContaining('Dexterity'),
      expect.stringContaining('Storm Set'),
      expect.stringContaining('2 pieces'),
      expect.stringContaining('Melee Power'),
      expect.stringContaining('Healing Amplification'),
      expect.stringContaining('5 pieces'),
      expect.stringContaining('Universal Spell Power'),
    ])
    fireEvent.click(screen.getByRole('columnheader', { name: 'Value' }))
    expect(rowTexts()).toEqual([
      expect.stringContaining('Dexterity'),
      expect.stringContaining('Strength'),
      expect.stringContaining('Storm Set'),
      expect.stringContaining('2 pieces'),
      expect.stringContaining('Healing Amplification'),
      expect.stringContaining('Melee Power'),
      expect.stringContaining('5 pieces'),
      expect.stringContaining('Universal Spell Power'),
    ])
    fireEvent.click(screen.getByRole('columnheader', { name: 'Enchantment' }))
    expect(rowTexts()).toEqual([
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

  it('opens the captured set card from the heading and its enchantment card from a tier row', async () => {
    const item = toItem(capturedRing as ApiItemDetail)
    const set = toSetDetail(capturedSet)
    const queryClient = new QueryClient()
    const fetchSet = vi.fn(async () => Response.json(capturedSet, { status: 200 }))
    vi.stubGlobal('fetch', fetchSet)
    renderWithRouter(
      <QueryClientProvider client={queryClient}>
        <HoverCardProvider>
          <EnchantmentList
            itemName={item.name}
            bonuses={item.bonuses}
            effects={item.effects}
            setDetail={set}
          />
        </HoverCardProvider>
      </QueryClientProvider>,
      '/resources/items/487',
    )
    const heading = (await screen.findByText(set.name)).closest('[role="row"]')!
    fireEvent.mouseEnter(heading)
    expect(
      await within(await screen.findByRole('dialog')).findByText(set.tiers[0].description!),
    ).toBeInTheDocument()
    expect(fetchSet).toHaveBeenCalledWith(expect.stringContaining('/v1/sets/93'), expect.anything())
    fireEvent.mouseLeave(heading)
    fireEvent.click(heading)
    fireEvent.mouseEnter(
      screen.getByRole('row', { name: /Profane Physical Resistance Rating \+5/ }),
    )
    expect(
      within(await screen.findByRole('dialog')).getByText('Physical Resistance Rating'),
    ).toBeInTheDocument()
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

  it('renders bonuses before effects with muted type text', () => {
    render(
      <EnchantmentList
        bonuses={[bonus({ bonusType: 'Insight' })]}
        effects={[effect({ target: 'Evil Outsider' })]}
      />,
    )
    expect(screen.getByText('Insight')).toBeInTheDocument()
    expect(screen.getByText('Evil Outsider')).toBeInTheDocument()
    expect(screen.getByText('Insight')).toHaveClass('resources-bonus-type')
  })

  it('omits an empty type for an effect without a target', () => {
    const { container } = render(
      <EnchantmentList bonuses={[]} effects={[effect({ target: null })]} />,
    )
    expect(container.querySelector('.resources-bonus-type')).toBeNull()
  })

  it('keeps a bonus description in its hover card and out of the ledger', () => {
    vi.useFakeTimers()
    render(
      <HoverCardProvider>
        <EnchantmentList
          bonuses={[
            bonus({
              name: 'Fire Resistance +30',
              statName: 'Fire Resistance',
              description: '+30 Enhancement bonus to Fire Resistance',
            }),
          ]}
          effects={[]}
        />
      </HoverCardProvider>,
    )
    expect(screen.queryByText('+30 Enhancement bonus to Fire Resistance')).toBeNull()
    fireEvent.mouseEnter(screen.getByRole('row', { name: /Fire Resistance/ }))
    act(() => vi.advanceTimersByTime(120))
    expect(
      within(screen.getByRole('dialog')).getByText('+30 Enhancement bonus to Fire Resistance'),
    ).toBeInTheDocument()
  })
})
