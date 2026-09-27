import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResourcesView from './ResourcesView'
import type { ItemDetail, ItemRow } from './queries/items'

// Router params are read via `useParams({ strict: false })`; swap the value
// per test to simulate each URL shape (/resources/items vs .../items/42).
let mockParams: Record<string, string> = { category: 'items' }
const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => mockParams,
}))

const ROWS: ItemRow[] = [
  {
    id: 42,
    name: 'Bloodstone',
    equipment_slot: 'Trinket',
    item_category: 'Trinket',
    minimum_level: 12,
    pack: 'Vault of Night',
    is_raid: true,
  },
]

const DETAIL: ItemDetail = {
  id: 42,
  name: 'Bloodstone',
  equipment_slot: 'Trinket',
  item_category: 'Trinket',
  item_type: null,
  minimum_level: 12,
  enhancement_bonus: null,
  material: null,
  race_required: null,
  description: null,
  drop_location: null,
  set_name: null,
  accepts_sentience: false,
  is_minor_artifact: false,
  wiki_url: null,
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  bonuses: [],
  effects: [],
  clickies: [],
  quests: [],
}

// The view reads game data through the TanStack Query hooks; mocking the hook
// module keeps these tests synchronous and free of a QueryClient. The state
// the gate reacts to (`isPending` / `error`) is swapped per test.
let rowsState: { data: ItemRow[] | undefined; isPending: boolean; error: unknown } = {
  data: ROWS,
  isPending: false,
  error: null,
}
const refetchMock = vi.fn()

vi.mock('./queries/useItems', () => ({
  useItemRows: () => ({ ...rowsState, refetch: refetchMock }),
  useItemDetail: (id: number | null) => ({
    data: id === 42 ? DETAIL : undefined,
    isPending: false,
    error: null,
  }),
  useAdventurePacks: () => ({ data: ['Vault of Night'] }),
  useStatOptions: () => ({ data: ['Charisma'] }),
  useItemIdsByStats: () => null,
  useItemIdsByPack: () => null,
  useSlotCandidates: () => ({}),
}))

beforeEach(() => {
  mockParams = { category: 'items' }
  rowsState = { data: ROWS, isPending: false, error: null }
  navigateMock.mockClear()
  refetchMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('ResourcesView data gate', () => {
  it('shows the loading skeleton instead of the picker while rows load', () => {
    rowsState = { data: undefined, isPending: true, error: null }
    render(<ResourcesView />)
    expect(screen.getByRole('status', { name: /loading game data/i })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('shows the error screen with a retry that refetches', async () => {
    rowsState = { data: undefined, isPending: false, error: new TypeError('Failed to fetch') }
    render(<ResourcesView />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetchMock).toHaveBeenCalledOnce()
  })
})

// These shortcuts were registered on the view's root <div>, so they only fired
// when focus was already inside it. Two everyday flows left focus elsewhere:
// clicking "Resources" in the nav bar (focus on the nav link) and opening a
// deep link (focus on <body>). In both cases the advertised keys did nothing.
describe('ResourcesView keyboard shortcuts', () => {
  it('focuses the search input on "/" when focus is outside the view', async () => {
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: /search items/i })
    expect(input).not.toHaveFocus()

    // Focus starts on <body> — the state after a nav-bar click or cold load.
    expect(document.body).toHaveFocus()
    await userEvent.keyboard('/')

    expect(input).toHaveFocus()
  })

  it('does not hijack "/" typed into a text field', async () => {
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: /search items/i })
    await userEvent.click(input)
    await userEvent.keyboard('a/b')

    expect(input).toHaveValue('a/b')
  })

  it('closes the drawer on Escape even when focus sits outside the view', async () => {
    mockParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    // Force the pre-fix focus state: a root-scoped listener would never see
    // this keydown, since the event fires on <body> and bubbles away from the
    // view rather than into it.
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.body).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('ignores Escape when the drawer is already closed', async () => {
    render(<ResourcesView />)
    await userEvent.keyboard('{Escape}')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('does not focus the search input on "/" while the drawer is open', async () => {
    mockParams = { category: 'items', id: '42' }
    const { container } = render(<ResourcesView />)
    // Query the DOM directly: the picker is `inert` while the drawer is open,
    // so the input is (correctly) absent from the accessibility tree.
    const input = container.querySelector('.resources-search-input')
    await userEvent.keyboard('/')
    expect(input).not.toHaveFocus()
  })
})

describe('ResourcesView drawer', () => {
  it('labels the dialog with the item name rather than a raw id', () => {
    mockParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    // The id is an internal detail; a screen reader should hear the item.
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Bloodstone/)
  })

  it('closes the drawer when the backdrop is clicked', async () => {
    mockParams = { category: 'items', id: '42' }
    render(<ResourcesView />)

    await userEvent.click(screen.getByRole('button', { name: 'Close item details' }))

    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('inerts the picker while the drawer is open', () => {
    mockParams = { category: 'items', id: '42' }
    const { container } = render(<ResourcesView />)
    expect(container.querySelector('.resources-picker')).toHaveAttribute('inert')
  })

  it('leaves the picker interactive when no item is selected', () => {
    const { container } = render(<ResourcesView />)
    expect(container.querySelector('.resources-picker')).not.toHaveAttribute('inert')
  })
})
