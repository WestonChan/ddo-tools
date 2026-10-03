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
    isLegacy: false,
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
  setId: null,
  canAcceptSentience: false,
  isMinorArtifact: false,
  wikiUrl: null,
  isLegacy: false,
  weaponStats: null,
  armorStats: null,
  augmentSlots: [],
  bonuses: [],
  effects: [],
  clickies: [],
  quests: [],
  questChains: [],
  sagas: [],
  adventurePackDrops: [],
  sourcesBeyondQuests: [],
}

let itemPageQueryState: {
  data: { total: number; items: ItemSummary[] } | undefined
  isPending: boolean
  isFetching: boolean
  error: unknown
} = {
  data: { total: ITEM_SUMMARIES.length, items: ITEM_SUMMARIES },
  isPending: false,
  isFetching: false,
  error: null,
}
let isItemDetailLoaded = true
const refetchMock = vi.fn()

vi.mock('./queries/useItems', () => ({
  useItemPage: () => ({
    ...itemPageQueryState,
    data: itemPageQueryState.data
      ? { pages: [itemPageQueryState.data], pageParams: [0] }
      : undefined,
    refetch: refetchMock,
  }),
  useItem: (id: number | null) => ({
    data: id === 42 && isItemDetailLoaded ? BLOODSTONE_ITEM : undefined,
    isPending: !isItemDetailLoaded,
    error: null,
  }),
  useAdventurePackNames: () => ({ data: ['Vault of Night'] }),
  useEquipmentSlotNames: () => ({ data: ['Trinket'] }),
  useEnchantmentNames: () => ({ data: ['Charisma'] }),
  useRaidQuests: () => ({ data: [] }),
  useFittingAugmentsBySlotLabel: () => ({}),
  useSet: () => ({ data: undefined, isPending: false, error: null }),
}))

beforeEach(() => {
  isItemDetailLoaded = true
  mockRouteParams = { category: 'items' }
  itemPageQueryState = {
    data: { total: 1, items: ITEM_SUMMARIES },
    isPending: false,
    isFetching: false,
    error: null,
  }
  navigateMock.mockClear()
  refetchMock.mockClear()
})

afterEach(() => {
  cleanup()
})

describe('ResourcesView data gate', () => {
  it('shows the loading skeleton instead of the picker while rows load', () => {
    itemPageQueryState = { data: undefined, isPending: true, isFetching: true, error: null }
    render(<ResourcesView />)
    expect(screen.getByRole('status', { name: /loading game data/i })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).toBeNull()
  })

  it('keeps the picker with a retry when the first request fails', async () => {
    itemPageQueryState = {
      data: undefined,
      isPending: false,
      isFetching: false,
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

  it('closes the detail on Escape even when focus sits outside the view', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.body).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('ignores Escape when the detail is already closed', async () => {
    render(<ResourcesView />)
    await userEvent.keyboard('{Escape}')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('does not focus the search input on "/" while a detail is selected', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: 'Search items' })
    await userEvent.keyboard('/')
    expect(input).not.toHaveFocus()
  })

  it('uses Escape to clear search text without closing the selected detail', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: 'Search items' })
    await userEvent.click(input)
    await userEvent.type(input, 'torc')
    await userEvent.keyboard('{Escape}')
    expect(input).toHaveValue('')
    expect(input).toHaveFocus()
    expect(navigateMock).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(input).toHaveFocus()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

describe('ResourcesView detail pane', () => {
  it('renders the selected item in a labelled pane without a modal', () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    expect(screen.getByRole('region', { name: 'Item details' })).toContainElement(
      screen.getByRole('heading', { name: 'Bloodstone' }),
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.querySelector('.modal-backdrop')).toBeNull()
  })

  it('closes the pane from the breadcrumb', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)

    await userEvent.click(screen.getByRole('button', { name: 'Back to items' }))

    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('keeps the picker interactive while the pane is open', () => {
    mockRouteParams = { category: 'items', id: '42' }
    const { container } = render(<ResourcesView />)
    expect(container.querySelector('.resources-picker')).not.toHaveAttribute('inert')
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeVisible()
  })

  it('shows a dashed placeholder and does not select the first row', () => {
    const { container } = render(<ResourcesView />)
    expect(container.querySelector('.resources-picker')).not.toHaveAttribute('inert')
    expect(screen.getByText('Select an item')).toHaveClass('wireframe-placeholder-label')
    expect(screen.queryByRole('row', { name: /Bloodstone/ })).not.toHaveAttribute('aria-current')
  })

  it('returns focus to the selected row when the URL closes', () => {
    mockRouteParams = { category: 'items', id: '42' }
    const view = render(<ResourcesView />)
    mockRouteParams = { category: 'items' }
    view.rerender(<ResourcesView />)
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
  })

  it('scrolls a stacked pane into view only after its detail card renders', () => {
    mockRouteParams = { category: 'items', id: '42' }
    isItemDetailLoaded = false
    const scrollIntoView = vi.fn()
    const previousScrollIntoView = HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = scrollIntoView
    try {
      const view = render(<ResourcesView />)
      const pane = screen.getByRole('region', { name: 'Item details' })
      Object.defineProperty(pane, 'offsetTop', { value: 800 })
      expect(scrollIntoView).not.toHaveBeenCalled()

      isItemDetailLoaded = true
      view.rerender(<ResourcesView />)
      expect(screen.getByRole('heading', { name: 'Bloodstone' })).toBeInTheDocument()
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    } finally {
      HTMLElement.prototype.scrollIntoView = previousScrollIntoView
    }
  })
})
