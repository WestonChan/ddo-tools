import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ResourcesView from './ResourcesView'
import type { Item, ItemSummary } from './queries/items'

let mockRouteParams: Record<string, string> = { category: 'items' }
const navigateMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  useParams: () => mockRouteParams,
}))

const ITEM_SUMMARIES: ItemSummary[] = [
  {
    id: 42,
    name: 'Bloodstone',
    equipmentSlot: 'Trinket',
    category: 'Trinket',
    minimumLevel: 12,
    pack: 'Vault of Night',
    isRaidLoot: true,
    isRareLoot: false,
    provenance: 'maetrim',
  },
]

const BLOODSTONE_ITEM: Item = {
  id: 42,
  name: 'Bloodstone',
  equipmentSlot: 'Trinket',
  category: 'Trinket',
  type: null,
  minimumLevel: 12,
  enhancementBonus: null,
  material: null,
  requiredRace: null,
  description: null,
  dropLocation: null,
  setName: null,
  canAcceptSentience: false,
  isMinorArtifact: false,
  wikiUrl: null,
  provenance: 'maetrim',
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  bonuses: [],
  effects: [],
  clickies: [],
  quests: [],
  questChains: [],
  sagas: [],
  sourcesBeyondQuests: [],
}

let itemSummariesQueryState: {
  data: ItemSummary[] | undefined
  isPending: boolean
  error: unknown
} = {
  data: ITEM_SUMMARIES,
  isPending: false,
  error: null,
}
const refetchMock = vi.fn()

vi.mock('./queries/useItems', () => ({
  useItemSummaries: () => ({ ...itemSummariesQueryState, refetch: refetchMock }),
  useItem: (id: number | null) => ({
    data: id === 42 ? BLOODSTONE_ITEM : undefined,
    isPending: false,
    error: null,
  }),
  useAdventurePackNames: () => ({ data: ['Vault of Night'] }),
  useStatNames: () => ({ data: ['Charisma'] }),
  useItemIdsWithAnyStat: () => null,
  useItemIdsInPack: () => null,
  useFittingAugmentsBySlotLabel: () => ({}),
}))

beforeEach(() => {
  mockRouteParams = { category: 'items' }
  itemSummariesQueryState = { data: ITEM_SUMMARIES, isPending: false, error: null }
  navigateMock.mockClear()
  refetchMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('ResourcesView data gate', () => {
  it('shows the loading skeleton instead of the picker while rows load', () => {
    itemSummariesQueryState = { data: undefined, isPending: true, error: null }
    render(<ResourcesView />)
    expect(screen.getByRole('status', { name: /loading game data/i })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('shows the error screen with a retry that refetches', async () => {
    itemSummariesQueryState = {
      data: undefined,
      isPending: false,
      error: new TypeError('Failed to fetch'),
    }
    render(<ResourcesView />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetchMock).toHaveBeenCalledOnce()
  })
})

describe('ResourcesView keyboard shortcuts', () => {
  it('focuses the search input on "/" when focus is outside the view', async () => {
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: /search items/i })
    expect(input).not.toHaveFocus()

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
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
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
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: 'Search items', hidden: true })
    await userEvent.keyboard('/')
    expect(input).not.toHaveFocus()
  })
})

describe('ResourcesView drawer', () => {
  it('labels the dialog with the item name rather than a raw id', () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    expect(screen.getByRole('dialog')).toHaveAccessibleName(/Bloodstone/)
  })

  it('closes the drawer when the backdrop is clicked', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)

    await userEvent.click(screen.getByRole('button', { name: 'Close item details' }))

    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('inerts the picker while the drawer is open', () => {
    mockRouteParams = { category: 'items', id: '42' }
    const { container } = render(<ResourcesView />)
    expect(container.querySelector('.resources-picker')).toHaveAttribute('inert')
  })

  it('leaves the picker interactive when no item is selected', () => {
    const { container } = render(<ResourcesView />)
    expect(container.querySelector('.resources-picker')).not.toHaveAttribute('inert')
  })
})
