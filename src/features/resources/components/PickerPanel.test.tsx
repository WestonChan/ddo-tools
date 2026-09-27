import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickerPanel } from './PickerPanel'
import type { ItemRow } from '../queries/items'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

// The panel reads its option lists and id-sets through the query hooks. The
// id-set hooks are spied so the tests can assert they are consulted only once
// a stat or pack is actually picked (the hooks themselves stay disabled until
// then — see `useItems.ts`).
const useItemIdsByStats = vi.fn((stats: readonly string[]) =>
  stats.length === 0 ? null : new Set<number>([1]),
)
const useItemIdsByPack = vi.fn((pack: string) => (pack === '' ? null : new Set<number>([2])))

vi.mock('../queries/useItems', () => ({
  useStatOptions: () => ({ data: ['Charisma', 'Strength'] }),
  useAdventurePacks: () => ({ data: ['Vault of Night', 'Shadowfell'] }),
  useItemIdsByStats: (stats: readonly string[]) => useItemIdsByStats(stats),
  useItemIdsByPack: (pack: string) => useItemIdsByPack(pack),
}))

function row(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 1,
    name: 'Bloodstone',
    equipment_slot: 'Trinket',
    item_category: 'Trinket',
    minimum_level: 12,
    pack: 'Vault of Night',
    is_raid: false,
    ...overrides,
  }
}

const ROWS: ItemRow[] = [
  row({ id: 1, name: 'Bloodstone', is_raid: true, minimum_level: 12 }),
  row({ id: 2, name: 'Cloak of Night', equipment_slot: 'Back', minimum_level: 20 }),
  row({ id: 3, name: 'Ring of Spell Storing', equipment_slot: 'Ring', minimum_level: 4 }),
]

function renderPanel(rows: ItemRow[] = ROWS): RenderResult {
  return render(
    <PickerPanel category="items" rows={rows} selectedId={null} />,
  )
}

function rowNames(): string[] {
  return screen
    .getAllByRole('button')
    .map((b) => b.textContent ?? '')
    .filter((t) => ROWS.some((r) => t.includes(r.name)))
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
})

describe('PickerPanel filters', () => {
  it('shows every row and a result count with no filters applied', () => {
    renderPanel()
    expect(screen.getByText('3 results')).toBeInTheDocument()
  })

  it('uses the singular noun for a single result', () => {
    renderPanel([ROWS[0]])
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  // The raid flag rides along on every row, so filtering is local.
  it('filters to raid items', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))

    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(rowNames().some((n) => n.includes('Bloodstone'))).toBe(true)
  })

  it('filters by equipment slot', async () => {
    renderPanel()
    await userEvent.selectOptions(screen.getByLabelText('Slot'), 'Back')
    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(rowNames().some((n) => n.includes('Cloak of Night'))).toBe(true)
  })

  it('filters by a minimum-level lower bound', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '13')
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('filters by a minimum-level upper bound', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText(/upper bound/i), '12')
    expect(screen.getByText('2 results')).toBeInTheDocument()
  })

  // Stats and pack genuinely need an API round trip — the row shape can't
  // answer them (a row carries only its alphabetically-first pack, and no
  // stat list at all). Assert the hooks are asked with a real selection only
  // once one is picked; with none they are called with the empty selection,
  // which is what keeps the underlying query disabled.
  it('asks for the stat item-id set only once a stat is picked', async () => {
    const { container } = renderPanel()
    expect(useItemIdsByStats).not.toHaveBeenCalledWith(expect.arrayContaining(['Charisma']))

    // "Any" is also the empty option label on both selects, so target the
    // multi-select's <summary> trigger directly.
    const trigger = container.querySelector('.resources-multiselect-trigger')
    await userEvent.click(trigger as Element)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Charisma' }))

    expect(useItemIdsByStats).toHaveBeenCalledWith(['Charisma'])
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('asks for the pack item-id set only once a pack is picked', async () => {
    renderPanel()
    expect(useItemIdsByPack).not.toHaveBeenCalledWith('Shadowfell')

    await userEvent.selectOptions(screen.getByLabelText('Pack'), 'Shadowfell')

    expect(useItemIdsByPack).toHaveBeenCalledWith('Shadowfell')
    // The mocked set contains only id 2.
    expect(rowNames().some((n) => n.includes('Cloak of Night'))).toBe(true)
  })

  it('combines filters with AND semantics', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.selectOptions(screen.getByLabelText('Slot'), 'Back')
    // Bloodstone is the raid item but sits in Trinket, so nothing matches.
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})

describe('PickerPanel active-filter chips', () => {
  it('renders a chip per active filter and clears just that one', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.selectOptions(screen.getByLabelText('Slot'), 'Back')

    const remove = screen.getByRole('button', { name: 'Remove filter: Raid' })
    await userEvent.click(remove)

    expect(screen.queryByRole('button', { name: 'Remove filter: Raid' })).toBeNull()
    expect(screen.getByRole('button', { name: /Remove filter: .*Back/ })).toBeInTheDocument()
  })

  it('renders the min/max level range as a single chip', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '5')
    await userEvent.type(screen.getByLabelText(/upper bound/i), '15')
    expect(screen.getByRole('button', { name: /Remove filter: ML 5–15/ })).toBeInTheDocument()
  })

  it('renders a one-sided range chip with a comparison sign', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '5')
    expect(screen.getByRole('button', { name: /Remove filter: ML ≥ 5/ })).toBeInTheDocument()
  })

  it('drops every filter via Clear filters', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))

    expect(screen.getByText('3 results')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove filter/ })).toBeNull()
  })
})

describe('PickerPanel empty states', () => {
  it('reports an empty table when there are no rows at all', () => {
    renderPanel([])
    expect(screen.getByText(/no items in database/i)).toBeInTheDocument()
  })

  it('reports no matches when filters exclude everything', async () => {
    renderPanel()
    await userEvent.type(screen.getByLabelText(/lower bound/i), '99')
    expect(screen.getByText(/no matches/i)).toBeInTheDocument()
  })
})

describe('PickerPanel navigation', () => {
  it('navigates to the item route when a row is chosen', async () => {
    renderPanel([ROWS[0]])
    await userEvent.click(screen.getByRole('button', { name: /Bloodstone/ }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/1' })
  })
})
