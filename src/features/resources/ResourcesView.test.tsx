import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResourcesView from './ResourcesView'
import type { ItemRow } from './queries/items'

// Router params are read via `useParams({ strict: false })`; swap the value
// per test to simulate each URL shape (/resources/items vs .../items/42).
let mockParams: Record<string, string> = { category: 'items' }
const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => mockParams,
}))

vi.mock('../../hooks/useDatabase', () => ({
  useDatabase: () => ({ db: {}, loading: false, error: null }),
}))

const ROWS: ItemRow[] = [
  {
    id: 42,
    name: 'Bloodstone',
    rarity: 'Rare',
    equipment_slot: 'Trinket',
    minimum_level: 12,
    pack: 'Vault of Night',
    is_raid: true,
  },
]

vi.mock('./queries/items', async () => {
  const actual = await vi.importActual<typeof import('./queries/items')>('./queries/items')
  return {
    ...actual,
    listItems: vi.fn(() => ROWS),
    listBonusStats: vi.fn(() => ['Charisma']),
    listAdventurePacks: vi.fn(() => ['Vault of Night']),
    findItemNameById: vi.fn(() => 'Bloodstone'),
    getItemDetail: vi.fn(() => ({
      id: 42,
      name: 'Bloodstone',
      rarity: 'Rare',
      equipment_slot: 'Trinket',
      item_category: null,
      minimum_level: 12,
      enhancement_bonus: null,
      material: null,
      binding: null,
      tooltip: null,
      description: null,
      wiki_url: null,
      weaponStats: null,
      armorStats: null,
      augmentSlots: [],
      upgrades: [],
      bonuses: [],
      effects: [],
      spellLinks: [],
      quests: [],
    })),
  }
})

beforeEach(() => {
  mockParams = { category: 'items' }
  navigateMock.mockClear()
})

afterEach(() => {
  cleanup()
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
