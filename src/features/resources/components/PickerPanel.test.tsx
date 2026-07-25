import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PickerPanel } from './PickerPanel'
import type { ItemRow } from '../queries/items'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('../../../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: {}, loading: false, error: null }),
}))

const findRaidItemIds = vi.fn(() => new Set<number>())
const findItemIdsByStats = vi.fn(() => new Set<number>([1]))
const findItemIdsByPack = vi.fn(() => new Set<number>([2]))

vi.mock('../queries/items', async () => {
  const actual = await vi.importActual<typeof import('../queries/items')>('../queries/items')
  return {
    ...actual,
    listBonusStats: vi.fn(() => ['Charisma', 'Strength']),
    listAdventurePacks: vi.fn(() => ['Vault of Night', 'Shadowfell']),
    findRaidItemIds: (...args: unknown[]) => findRaidItemIds(...(args as [])),
    findItemIdsByStats: (...args: unknown[]) => findItemIdsByStats(...(args as [])),
    findItemIdsByPack: (...args: unknown[]) => findItemIdsByPack(...(args as [])),
  }
})

function row(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 1,
    name: 'Bloodstone',
    rarity: null,
    equipment_slot: 'Trinket',
    minimum_level: 12,
    pack: 'Vault of Night',
    is_raid: false,
    ...overrides,
  }
}

const ROWS: ItemRow[] = [
  row({ id: 1, name: 'Bloodstone', is_raid: true, rarity: 'Rare', minimum_level: 12 }),
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

  // The raid flag already rides along on every row (listItems stamps it), so
  // filtering must not fire a second `findRaidItemIds` query. Before this, the
  // join ran once at mount for everyone AND again on toggle.
  it('filters to raid items without issuing another raid query', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Raid only' }))

    expect(screen.getByText('1 result')).toBeInTheDocument()
    expect(rowNames().some((n) => n.includes('Bloodstone'))).toBe(true)
    expect(findRaidItemIds).not.toHaveBeenCalled()
  })

  it('filters to rare items', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    expect(screen.getByText('1 result')).toBeInTheDocument()
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

  // Stats and pack genuinely need a SQL round trip — the row shape can't
  // answer them (a row carries only its alphabetically-first pack, and no
  // stat list at all). Assert they're queried lazily, not on mount.
  it('queries the stat item-id set only once a stat is picked', async () => {
    const { container } = renderPanel()
    expect(findItemIdsByStats).not.toHaveBeenCalled()

    // "Any" is also the empty option label on both selects, so target the
    // multi-select's <summary> trigger directly.
    const trigger = container.querySelector('.resources-multiselect-trigger')
    await userEvent.click(trigger as Element)
    await userEvent.click(screen.getByRole('checkbox', { name: 'Charisma' }))

    expect(findItemIdsByStats).toHaveBeenCalledWith(expect.anything(), ['Charisma'])
    expect(screen.getByText('1 result')).toBeInTheDocument()
  })

  it('queries the pack item-id set only once a pack is picked', async () => {
    renderPanel()
    expect(findItemIdsByPack).not.toHaveBeenCalled()

    await userEvent.selectOptions(screen.getByLabelText('Pack'), 'Shadowfell')

    expect(findItemIdsByPack).toHaveBeenCalledWith(expect.anything(), 'Shadowfell')
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
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))

    const remove = screen.getByRole('button', { name: 'Remove filter: Raid' })
    await userEvent.click(remove)

    expect(screen.queryByRole('button', { name: 'Remove filter: Raid' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remove filter: Rare' })).toBeInTheDocument()
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
