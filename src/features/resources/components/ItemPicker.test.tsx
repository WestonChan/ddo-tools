import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemPicker } from './ItemPicker'
import type { ItemSummary } from '../queries/items'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

const useItemIdsWithAnyStatMock = vi.fn((stats: readonly string[]) =>
  stats.length === 0 ? null : new Set<number>([1]),
)
const useItemIdsInPackMock = vi.fn((pack: string) => (pack === '' ? null : new Set<number>([2])))

vi.mock('../queries/useItems', () => ({
  useStatNames: () => ({ data: ['Charisma', 'Strength'] }),
  useAdventurePackNames: () => ({ data: ['Vault of Night', 'Shadowfell'] }),
  useItemIdsWithAnyStat: (stats: readonly string[]) => useItemIdsWithAnyStatMock(stats),
  useItemIdsInPack: (pack: string) => useItemIdsInPackMock(pack),
}))

function itemRow(overrides: Partial<ItemSummary> = {}): ItemSummary {
  return {
    id: 1,
    name: 'Bloodstone',
    equipmentSlot: 'Trinket',
    category: 'Trinket',
    minimumLevel: 12,
    pack: 'Vault of Night',
    isRaidLoot: false,
    isRareLoot: false,
    provenance: 'maetrim',
    ...overrides,
  }
}

const SAMPLE_ITEMS: ItemSummary[] = [
  itemRow({ id: 1, name: 'Bloodstone', isRaidLoot: true, minimumLevel: 12 }),
  itemRow({ id: 2, name: 'Cloak of Night', equipmentSlot: 'Back', minimumLevel: 20 }),
  itemRow({
    id: 3,
    name: 'Ring of Spell Storing',
    equipmentSlot: 'Ring',
    minimumLevel: 4,
    isRareLoot: true,
  }),
]

function renderItemPicker(items: ItemSummary[] = SAMPLE_ITEMS): RenderResult {
  return render(<ItemPicker category="items" items={items} selectedItemId={null} />)
}

function shownItemNames(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((t) => SAMPLE_ITEMS.some((r) => t.includes(r.name)))
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('ItemPicker filters', () => {
  it('shows every row and a result count with no filters applied', () => {
    renderItemPicker()
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('uses the singular noun for a single result', () => {
    renderItemPicker([SAMPLE_ITEMS[0]])
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('filters to raid items', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))

    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(shownItemNames().some((n) => n.includes('Bloodstone'))).toBe(true)
  })

  it('filters to rare items', async () => {
    renderItemPicker()
    const toggle = screen.getByRole('button', { name: 'Rare only' })
    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(shownItemNames().some((n) => n.includes('Ring of Spell Storing'))).toBe(true)
  })

  it('combines the rare and raid toggles with AND semantics', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })

  it('filters by equipment slot', async () => {
    renderItemPicker()
    await userEvent.selectOptions(screen.getByLabelText('Slot'), 'Back')
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(shownItemNames().some((n) => n.includes('Cloak of Night'))).toBe(true)
  })

  it('filters by a minimum-level lower bound', async () => {
    renderItemPicker()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '13')
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('filters by a minimum-level upper bound', async () => {
    renderItemPicker()
    await userEvent.type(screen.getByLabelText(/upper bound/i), '12')
    expect(screen.getByText('2 results')).toBeInTheDocument()
  })

  it('asks for the stat item-id set only once a stat is picked', async () => {
    const { container } = renderItemPicker()
    expect(useItemIdsWithAnyStatMock).not.toHaveBeenCalledWith(expect.arrayContaining(['Charisma']))

    const trigger = container.querySelector('.resources-multiselect-trigger')
    await userEvent.click(trigger as Element)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Charisma' }))

    expect(useItemIdsWithAnyStatMock).toHaveBeenCalledWith(['Charisma'])
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('asks for the pack item-id set only once a pack is picked', async () => {
    renderItemPicker()
    expect(useItemIdsInPackMock).not.toHaveBeenCalledWith('Shadowfell')

    await userEvent.selectOptions(screen.getByLabelText('Pack'), 'Shadowfell')

    expect(useItemIdsInPackMock).toHaveBeenCalledWith('Shadowfell')
    expect(shownItemNames().some((n) => n.includes('Cloak of Night'))).toBe(true)
  })

  it('combines filters with AND semantics', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.selectOptions(screen.getByLabelText('Slot'), 'Back')
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})

describe('ItemPicker active-filter chips', () => {
  it('renders a chip per active filter and clears just that one', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.selectOptions(screen.getByLabelText('Slot'), 'Back')

    const remove = screen.getByRole('button', { name: 'Remove filter: Raid' })
    await userEvent.click(remove)

    expect(screen.queryByRole('button', { name: 'Remove filter: Raid' })).toBeNull()
    expect(screen.getByRole('button', { name: /Remove filter: .*Back/ })).toBeInTheDocument()
  })

  it('renders a Rare chip that clears the rare toggle', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Remove filter: Rare' }))

    expect(screen.getByRole('button', { name: 'Rare only' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('renders the min/max level range as a single chip', async () => {
    renderItemPicker()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '5')
    await userEvent.type(screen.getByLabelText(/upper bound/i), '15')
    expect(screen.getByRole('button', { name: /Remove filter: ML 5–15/ })).toBeInTheDocument()
  })

  it('renders a one-sided range chip with a comparison sign', async () => {
    renderItemPicker()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '5')
    expect(screen.getByRole('button', { name: /Remove filter: ML ≥ 5/ })).toBeInTheDocument()
  })

  it('drops every filter via Clear filters', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(screen.getByText('3 results')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove filter/ })).toBeNull()
  })
})

describe('ItemPicker empty states', () => {
  it('reports an empty table when there are no rows at all', () => {
    renderItemPicker([])
    expect(screen.getByText(/no items in database/i)).toBeInTheDocument()
  })

  it('reports no matches when filters exclude everything', async () => {
    renderItemPicker()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '99')
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})

describe('ItemPicker navigation', () => {
  it('navigates to the item route when a row is chosen', async () => {
    renderItemPicker([SAMPLE_ITEMS[0]])
    await userEvent.click(screen.getByRole('button', { name: /Bloodstone/ }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/1' })
  })
})
