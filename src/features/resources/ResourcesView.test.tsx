import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  act,
  render,
  renderHook,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoverCardProvider } from '../../components'
import ResourcesView from './ResourcesView'
import type { Effect, Item, ItemAugmentSlot, ItemSummary } from './queries/items'
import type { SetDetail } from './queries/sets'
import capturedEffectsPage from './queries/fixtures/effects-page.json'
import {
  resetResourceListSessionsForTests,
  setResourceListSession,
  useResourceListSession,
} from './resourceListSessions'

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
  modifiers: [],
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
let itemEffects: Effect[] = []
const STRENGTH_EFFECT: Effect = {
  id: 1,
  name: 'Strength',
  verboseName: 'Strength +2',
  description: null,
  bonusType: 'Enhancement',
  value: 2,
  value2: null,
  tier: null,
  bonuses: [],
  damage: [],
  sortOrder: 0,
}
let itemAugmentSlots: ItemAugmentSlot[] = []
let stackedSet: SetDetail | null = null
const refetchMock = vi.fn()
const itemPageRequests = vi.fn()

vi.mock('./queries/useItems', () => ({
  useItemPage: (...request: unknown[]) => {
    itemPageRequests(...request)
    return {
      ...itemPageQueryState,
      data: itemPageQueryState.data
        ? { pages: [itemPageQueryState.data], pageParams: [0] }
        : undefined,
      refetch: refetchMock,
    }
  },
  useItem: (id: number | null) => {
    const selectedItem = itemPageQueryState.data?.items.find((item) => item.id === id)
    return {
      data:
        selectedItem && isItemDetailLoaded
          ? {
              ...BLOODSTONE_ITEM,
              id: selectedItem.id,
              name: selectedItem.name,
              effects: itemEffects,
              augmentSlots: itemAugmentSlots,
              setId: stackedSet?.id ?? null,
              setName: stackedSet?.name ?? null,
            }
          : undefined,
      isPending: !isItemDetailLoaded,
      error: null,
    }
  },
  useAdventurePackNames: () => ({ data: ['Vault of Night'] }),
  useEquipmentSlotNames: () => ({ data: ['Trinket'] }),
  useEffectVocabulary: () => ({
    data: { rows: [capturedEffectsPage.effects[0]], total: capturedEffectsPage.total },
    isPending: false,
  }),
  useSetVocabulary: () => ({ data: { rows: [], total: 0 }, isPending: false }),
  useEffectDetail: () => ({ data: undefined, isPending: false }),
  useRaidQuests: () => ({ data: [] }),
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
  useSet: (id: number | null) => ({
    data: id === stackedSet?.id ? stackedSet : undefined,
    isPending: false,
    error: null,
  }),
}))

beforeEach(() => {
  sessionStorage.clear()
  resetResourceListSessionsForTests()
  isItemDetailLoaded = true
  itemEffects = []
  itemAugmentSlots = []
  stackedSet = null
  mockRouteParams = { category: 'items' }
  itemPageQueryState = {
    data: { total: 1, items: ITEM_SUMMARIES },
    isPending: false,
    isFetching: false,
    error: null,
  }
  navigateMock.mockReset()
  refetchMock.mockClear()
  itemPageRequests.mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('resource list sessions', () => {
  it('restores filters, match mode, set bonuses, search, sort, and scroll after leaving the view', async () => {
    const user = userEvent.setup()
    const view = render(<ResourcesView />)
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('option', { name: /Acid Absorption.*Stat/ }))
    await user.click(screen.getByRole('button', { name: 'All' }))
    await user.click(screen.getByRole('checkbox', { name: 'Include set bonuses' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search items' }), 'stone')
    await user.click(screen.getByRole('columnheader', { name: 'Name' }))
    const body = view.container.querySelector<HTMLElement>('.ledger-body')!
    body.scrollTop = 48
    fireEvent.scroll(body)
    await waitFor(() => expect(itemPageRequests.mock.lastCall?.[1]).toBe('stone'))
    const requestBeforeLeaving = itemPageRequests.mock.lastCall
    expect(requestBeforeLeaving?.[0]).toMatchObject({
      bonuses: ['Acid Absorption'],
      bonusMatch: 'all',
    })
    expect(requestBeforeLeaving?.[2]).toBe(true)
    expect(requestBeforeLeaving?.[3]).toEqual({ key: 'name', direction: 'asc' })

    view.unmount()
    const restoredView = render(<ResourcesView />)
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('stone')
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    )
    expect(screen.getByRole('button', { name: 'Show applied · 1' })).toBeInTheDocument()
    expect(restoredView.container.querySelector('.ledger-body')).toHaveProperty('scrollTop', 48)
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('checkbox', { name: 'Include set bonuses' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(itemPageRequests.mock.lastCall).toEqual(requestBeforeLeaving)

    act(() => setResourceListSession('sets', { searchQuery: 'wild' }))
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('stone')
    expect(screen.queryByRole('button', { name: 'Show applied · 1' })).toBeNull()
    expect(itemPageRequests.mock.lastCall?.[0]).toMatchObject({ bonuses: [] })
    expect(itemPageRequests.mock.lastCall?.[1]).toBe('stone')
    expect(renderHook(() => useResourceListSession('sets')).result.current.searchQuery).toBe('wild')
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('checkbox', { name: 'Include set bonuses' })).not.toBeChecked()
    restoredView.unmount()
    resetResourceListSessionsForTests()
    render(<ResourcesView />)
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('stone')
    expect(screen.queryByRole('button', { name: 'Show applied · 1' })).toBeNull()
  })
})

const STACK_ITEMS = [
  ITEM_SUMMARIES[0],
  { ...ITEM_SUMMARIES[0], id: 43, name: 'Heartstone' },
  { ...ITEM_SUMMARIES[0], id: 44, name: 'Moonstone' },
]

function renderStackedResourcesView(): ReturnType<typeof render> {
  stackedSet = {
    id: 93,
    name: 'Stone Set',
    items: STACK_ITEMS.map((item) => ({
      id: item.id,
      name: item.name,
      slot: item.equipmentSlot,
      minimumLevel: item.minimumLevel,
    })),
    tiers: [],
  }
  itemPageQueryState = {
    data: { total: STACK_ITEMS.length, items: STACK_ITEMS },
    isPending: false,
    isFetching: false,
    error: null,
  }
  navigateMock.mockImplementation((navigation: { to: string }) => {
    mockRouteParams = { category: 'items', id: navigation.to.split('/').at(-1) ?? '' }
  })
  return render(
    <HoverCardProvider>
      <ResourcesView />
    </HoverCardProvider>,
  )
}

function openSetPieceFromPane(name: string): void {
  const pane = screen.getByRole('region', { name: 'Item details' })
  const setAnchor = pane.querySelector<HTMLElement>('.resources-hover-anchor')
  expect(setAnchor).not.toBeNull()
  fireEvent.mouseEnter(setAnchor!)
  act(() => vi.advanceTimersByTime(120))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: new RegExp(name) }),
  )
}

function openFirstItemFromList(view: ReturnType<typeof render>): void {
  fireEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
  view.rerender(
    <HoverCardProvider>
      <ResourcesView />
    </HoverCardProvider>,
  )
  expect(screen.getByRole('heading', { name: 'Bloodstone' })).toBeInTheDocument()
}

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
  it('closes a wide detail from a pane control and returns focus to its list row', async () => {
    navigateMock.mockImplementation(({ to }: { to: string }) => {
      mockRouteParams = to.endsWith('/42') ? { category: 'items', id: '42' } : { category: 'items' }
    })
    const view = render(<ResourcesView />)
    await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
    view.rerender(<ResourcesView />)
    const backToItems = screen.getByRole('button', { name: 'Back to items' })
    backToItems.focus()

    await userEvent.keyboard('{Escape}')

    expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items', replace: true })
    view.rerender(<ResourcesView />)
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
  })

  it('closes a detail from an enchantment row and returns focus to the open item', async () => {
    itemEffects = [STRENGTH_EFFECT]
    navigateMock.mockImplementation(({ to }: { to: string }) => {
      mockRouteParams = to.endsWith('/42') ? { category: 'items', id: '42' } : { category: 'items' }
    })
    const view = render(<ResourcesView />)
    await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
    view.rerender(<ResourcesView />)
    const pane = screen.getByRole('region', { name: 'Item details' })
    const enchantmentRow = within(pane).getByRole('row', { name: /Strength/ })
    enchantmentRow.focus()

    await userEvent.keyboard('{Escape}')

    expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items', replace: true })
    view.rerender(<ResourcesView />)
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
  })

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

  it('does not close the detail on Escape when focus sits outside the view', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    ;(document.activeElement as HTMLElement | null)?.blur()
    expect(document.body).toHaveFocus()

    await userEvent.keyboard('{Escape}')

    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('keeps the open item route and tab focus when category keys reach the same tab', async () => {
    const previousPath = window.location.pathname
    try {
      navigateMock.mockImplementationOnce(({ to }: { to: string }) => {
        window.history.replaceState(null, '', to)
        mockRouteParams = { category: 'items', id: to.split('/').at(-1) ?? '' }
      })
      const view = render(<ResourcesView />)
      const search = screen.getByRole('searchbox', { name: 'Search items' })
      act(() => search.focus())
      await userEvent.keyboard('{ArrowDown}{Enter}')
      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/42' })
      view.rerender(<ResourcesView />)
      const itemsTab = screen.getByRole('tab', { name: 'Items' })
      act(() => itemsTab.focus())
      await userEvent.keyboard('{ArrowLeft}{ArrowRight}{Home}{End}')
      expect(itemsTab).toHaveFocus()
      expect(window.location.pathname).toBe('/resources/items/42')
      expect(navigateMock).toHaveBeenCalledTimes(1)
      expect(screen.getByRole('region', { name: 'Item details' })).toBeInTheDocument()
    } finally {
      window.history.replaceState(null, '', previousPath)
    }
  })

  it('ignores Escape when the detail is already closed', async () => {
    render(<ResourcesView />)
    await userEvent.keyboard('{Escape}')
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('focuses the visible search input on "/" while a detail is selected', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: 'Search items' })
    await userEvent.keyboard('/')
    expect(input).toHaveFocus()
    expect(input).toHaveValue('')
  })

  it('leaves "/" alone while a narrow detail covers the list', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    try {
      mockRouteParams = { category: 'items', id: '42' }
      render(<ResourcesView />)
      expect(screen.queryByRole('searchbox')).toBeNull()
      const event = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true })
      document.dispatchEvent(event)
      expect(event.defaultPrevented).toBe(false)
      expect(document.body).toHaveFocus()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('leaves "/" typed into another text field alone', async () => {
    render(<ResourcesView />)
    const textField = document.createElement('textarea')
    document.body.append(textField)
    try {
      await userEvent.click(textField)
      await userEvent.keyboard('a/b')
      expect(textField).toHaveValue('a/b')
      expect(screen.getByRole('searchbox', { name: 'Search items' })).not.toHaveFocus()
    } finally {
      textField.remove()
    }
  })

  it('focuses the opened detail after Enter from a row in the narrow layout', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    try {
      const view = render(<ResourcesView />)
      const search = screen.getByRole('searchbox', { name: 'Search items' })
      search.focus()
      await userEvent.keyboard('{ArrowDown}{Enter}')
      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/42' })
      expect(search).not.toHaveFocus()
      expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()

      mockRouteParams = { category: 'items', id: '42' }
      view.rerender(<ResourcesView />)
      expect(screen.queryByRole('searchbox')).toBeNull()
      expect(screen.getByRole('heading', { name: 'Bloodstone' })).toHaveFocus()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('moves focus from the opened row to the detail after Enter beside it', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    try {
      const view = render(<ResourcesView />)
      const search = screen.getByRole('searchbox', { name: 'Search items' })
      search.focus()
      await userEvent.keyboard('{ArrowDown}{Enter}')
      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/42' })

      mockRouteParams = { category: 'items', id: '42' }
      view.rerender(<ResourcesView />)
      const title = screen.getByRole('heading', { name: 'Bloodstone' })
      expect(title).toHaveFocus()
      await userEvent.tab()
      expect(screen.getByRole('button', { name: 'Copy link to this item' })).toHaveFocus()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it.each([375, 1440])('focuses the detail after clicking a row at %ipx', async (width) => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    try {
      const view = render(<ResourcesView />)
      await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
      mockRouteParams = { category: 'items', id: '42' }
      view.rerender(<ResourcesView />)
      expect(screen.getByRole('heading', { name: 'Bloodstone' })).toHaveFocus()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('waits for the opened item to render before focusing its title', async () => {
    isItemDetailLoaded = false
    const view = render(<ResourcesView />)
    await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
    mockRouteParams = { category: 'items', id: '42' }
    view.rerender(<ResourcesView />)
    expect(screen.queryByRole('heading', { name: 'Bloodstone' })).toBeNull()

    isItemDetailLoaded = true
    view.rerender(<ResourcesView />)
    expect(screen.getByRole('heading', { name: 'Bloodstone' })).toHaveFocus()
  })

  it('keeps focus in the list while arrowing without opening a detail', async () => {
    const view = render(<ResourcesView />)
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    search.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(view.container.querySelector('.resources-detail-pane--empty')).toBeInTheDocument()
  })

  it('keeps focus on a row on Escape without closing the selected detail', async () => {
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const input = screen.getByRole('searchbox', { name: 'Search items' })
    await userEvent.click(input)
    await userEvent.type(input, 'torc')
    await userEvent.keyboard('{ArrowDown}{Escape}')
    expect(input).toHaveValue('torc')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    expect(navigateMock).not.toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    expect(input).toHaveValue('torc')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    input.focus()
    await userEvent.keyboard('{Escape}')
    expect(input).toHaveValue('')
    expect(navigateMock).not.toHaveBeenCalled()
  })
})

describe('ResourcesView detail pane', () => {
  it('closes an open pane card before the detail, including when pinned', () => {
    vi.useFakeTimers()
    const view = renderStackedResourcesView()
    openFirstItemFromList(view)
    const setAnchor = screen
      .getByRole('region', { name: 'Item details' })
      .querySelector<HTMLElement>('.resources-hover-anchor')!
    fireEvent.keyDown(document, { key: 'Tab' })
    setAnchor.focus()
    act(() => vi.advanceTimersByTime(120))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(setAnchor, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(navigateMock).toHaveBeenCalledTimes(1)

    setAnchor.blur()
    fireEvent.keyDown(document, { key: 'Tab' })
    setAnchor.focus()
    act(() => vi.advanceTimersByTime(120))
    fireEvent.keyDown(setAnchor, { key: 't' })
    expect(screen.getByRole('dialog')).toHaveClass('hover-card--pinned')
    fireEvent.keyDown(setAnchor, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(navigateMock).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(setAnchor, { key: 'Escape' })
    expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items', replace: true })
  })

  it('cancels a keyboard column move in the pane ledger without closing the detail', async () => {
    itemEffects = [STRENGTH_EFFECT]
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const pane = screen.getByRole('region', { name: 'Item details' })
    const headers = within(pane)
      .getAllByRole('columnheader')
      .filter((header) => header.hasAttribute('data-column-key'))
    headers.forEach((header, index) => {
      vi.spyOn(header, 'getBoundingClientRect').mockReturnValue(
        DOMRect.fromRect({ x: index * 100, y: 0, width: 100, height: 30 }),
      )
    })
    const typeHeader = within(pane).getByRole('columnheader', { name: 'Type' })
    act(() => typeHeader.focus())
    await userEvent.keyboard('m')
    await waitFor(() => expect(typeHeader).toHaveClass('ledger-header-cell--dragging'))

    await userEvent.keyboard('{ArrowRight}{Escape}')

    await waitFor(() => expect(typeHeader).not.toHaveClass('ledger-header-cell--dragging'))
    expect(navigateMock).not.toHaveBeenCalled()
    expect(typeHeader).toHaveFocus()

    await userEvent.keyboard('{Escape}')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('dismisses a pointer-opened pane card before closing the detail', () => {
    vi.useFakeTimers()
    const view = renderStackedResourcesView()
    openFirstItemFromList(view)
    const pane = screen.getByRole('region', { name: 'Item details' })
    const backToItems = within(pane).getByRole('button', { name: 'Back to items' })
    backToItems.focus()
    const setAnchor = pane.querySelector<HTMLElement>('.resources-hover-anchor')!
    fireEvent.mouseEnter(setAnchor)
    act(() => vi.advanceTimersByTime(120))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(backToItems, { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(navigateMock).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(backToItems, { key: 'Escape' })
    expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items', replace: true })
  })

  it('closes an open augment picker before closing the detail', async () => {
    itemAugmentSlots = [
      { sortOrder: 0, label: 'red', family: 'standard', qualifier: null, options: [] },
    ]
    mockRouteParams = { category: 'items', id: '42' }
    render(<ResourcesView />)
    const slotButton = screen.getByRole('button', { name: 'Red slot' })
    await userEvent.click(slotButton)
    expect(slotButton).toHaveAttribute('aria-expanded', 'true')

    await userEvent.keyboard('{Escape}')

    expect(slotButton).toHaveAttribute('aria-expanded', 'false')
    expect(navigateMock).not.toHaveBeenCalled()

    await userEvent.keyboard('{Escape}')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
  })

  it('closes the whole three-item detail stack on Escape', () => {
    vi.useFakeTimers()
    const view = renderStackedResourcesView()
    openFirstItemFromList(view)
    openSetPieceFromPane('Heartstone')
    openSetPieceFromPane('Moonstone')
    expect(screen.getByRole('heading', { name: 'Moonstone' })).toHaveFocus()

    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })

    expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items', replace: true })
    expect(screen.getByRole('button', { name: 'Back one level' })).toBeInTheDocument()
  })

  it('uses history back for Escape from a detail opened from the narrow list', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      mockRouteParams = { category: 'items' }
    })
    navigateMock.mockImplementation(({ to }: { to: string }) => {
      mockRouteParams = { category: 'items', id: to.split('/').at(-1) ?? '' }
    })
    try {
      const view = render(<ResourcesView />)
      await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
      view.rerender(<ResourcesView />)
      const backToItems = screen.getByRole('button', { name: 'Back to items' })
      backToItems.focus()

      await userEvent.keyboard('{Escape}')

      expect(back).toHaveBeenCalledOnce()
      expect(navigateMock).toHaveBeenCalledTimes(1)
      view.rerender(<ResourcesView />)
      expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    } finally {
      back.mockRestore()
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('focuses the first loaded list row when the closed item is absent', async () => {
    itemPageQueryState = {
      data: { total: 1, items: [{ ...ITEM_SUMMARIES[0], id: 43, name: 'Heartstone' }] },
      isPending: false,
      isFetching: false,
      error: null,
    }
    mockRouteParams = { category: 'items', id: '42' }
    navigateMock.mockImplementation(() => {
      mockRouteParams = { category: 'items' }
    })
    const view = render(<ResourcesView />)
    const backToItems = screen.getByRole('button', { name: 'Back to items' })
    backToItems.focus()

    await userEvent.keyboard('{Escape}')

    view.rerender(<ResourcesView />)
    expect(screen.getByRole('row', { name: /Heartstone/ })).toHaveFocus()
  })

  it('keeps focus in the list search when no rows exist after closing', async () => {
    itemPageQueryState = {
      data: { total: 0, items: [] },
      isPending: false,
      isFetching: false,
      error: null,
    }
    mockRouteParams = { category: 'items', id: '42' }
    navigateMock.mockImplementation(() => {
      mockRouteParams = { category: 'items' }
    })
    const view = render(<ResourcesView />)
    screen.getByRole('button', { name: 'Back to items' }).focus()

    await userEvent.keyboard('{Escape}')

    view.rerender(<ResourcesView />)
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveFocus()
  })

  it('replaces a narrow deep link when Escape closes its detail', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    mockRouteParams = { category: 'items', id: '42' }
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    try {
      render(<ResourcesView />)
      screen.getByRole('button', { name: 'Back to items' }).focus()

      await userEvent.keyboard('{Escape}')

      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
      expect(back).not.toHaveBeenCalled()
    } finally {
      back.mockRestore()
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('shows three pane-opened items in the breadcrumb and pops one level', () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    vi.useFakeTimers()
    try {
      const view = renderStackedResourcesView()
      openFirstItemFromList(view)
      openSetPieceFromPane('Heartstone')
      openSetPieceFromPane('Moonstone')

      const breadcrumb = screen.getByRole('navigation', { name: 'Detail breadcrumb' })
      expect(within(breadcrumb).getByRole('button', { name: 'Bloodstone' })).toBeInTheDocument()
      expect(within(breadcrumb).getByRole('button', { name: 'Heartstone' })).toBeInTheDocument()
      expect(within(breadcrumb).getByText('Moonstone')).toBeInTheDocument()
      expect(within(breadcrumb).queryByRole('button', { name: 'Moonstone' })).toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Back one level' }))
      expect(within(breadcrumb).getByText('Heartstone')).toBeInTheDocument()
      expect(within(breadcrumb).queryByText('Moonstone')).toBeNull()
      expect(screen.getByRole('heading', { name: 'Heartstone' })).toBeInTheDocument()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('starts a new one-item stack when a list row selects the URL item again', () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    vi.useFakeTimers()
    try {
      const view = renderStackedResourcesView()
      openFirstItemFromList(view)
      openSetPieceFromPane('Heartstone')
      expect(screen.getByRole('button', { name: 'Back one level' })).toBeInTheDocument()

      fireEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
      view.rerender(
        <HoverCardProvider>
          <ResourcesView />
        </HoverCardProvider>,
      )
      const breadcrumb = screen.getByRole('navigation', { name: 'Detail breadcrumb' })
      expect(within(breadcrumb).getByText('Bloodstone')).toBeInTheDocument()
      expect(within(breadcrumb).queryByText('Heartstone')).toBeNull()
      expect(screen.queryByRole('button', { name: 'Back one level' })).toBeNull()
      expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items/42', replace: true })
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('starts a new one-item stack from a list row hover card', () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    vi.useFakeTimers()
    try {
      const view = renderStackedResourcesView()
      openFirstItemFromList(view)
      openSetPieceFromPane('Heartstone')

      fireEvent.mouseEnter(screen.getByRole('row', { name: /Bloodstone/ }))
      act(() => vi.advanceTimersByTime(260))
      const listItemCard = screen.getByRole('dialog')
      fireEvent.mouseEnter(within(listItemCard).getByText('Stone Set'))
      act(() => vi.advanceTimersByTime(120))
      const setCard = screen
        .getAllByRole('dialog')
        .find((card) => within(card).queryByRole('button', { name: /Moonstone/ }))
      expect(setCard).toBeDefined()
      fireEvent.click(within(setCard!).getByRole('button', { name: /Moonstone/ }))
      view.rerender(
        <HoverCardProvider>
          <ResourcesView />
        </HoverCardProvider>,
      )

      expect(screen.getByRole('heading', { name: 'Moonstone' })).toHaveFocus()
      const breadcrumb = screen.getByRole('navigation', { name: 'Detail breadcrumb' })
      expect(within(breadcrumb).getByText('Moonstone')).toBeInTheDocument()
      expect(within(breadcrumb).queryByText('Bloodstone')).toBeNull()
      expect(within(breadcrumb).queryByText('Heartstone')).toBeNull()
      expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items/44', replace: true })
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('returns to the list after three wide row clicks and a narrow Back', async () => {
    const previousWidth = window.innerWidth
    const previousResizeObserver = globalThis.ResizeObserver
    const visitedPaths = ['/resources/items']
    let onResize: ResizeObserverCallback | undefined
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe(element: Element): void {
          if (element.classList.contains('resources-body')) onResize = this.callback
        }
        unobserve(): void {}
        disconnect(): void {}
      },
    )
    const items = [
      ITEM_SUMMARIES[0],
      { ...ITEM_SUMMARIES[0], id: 43, name: 'Heartstone' },
      { ...ITEM_SUMMARIES[0], id: 44, name: 'Moonstone' },
    ]
    itemPageQueryState = {
      data: { total: items.length, items },
      isPending: false,
      isFetching: false,
      error: null,
    }
    navigateMock.mockImplementation((navigation: { to: string } & Record<string, unknown>) => {
      if (navigation.replace === true) visitedPaths[visitedPaths.length - 1] = navigation.to
      else visitedPaths.push(navigation.to)
      mockRouteParams = { category: 'items', id: navigation.to.split('/').at(-1) ?? '' }
    })
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {
      visitedPaths.pop()
      mockRouteParams = { category: 'items' }
    })
    try {
      const view = render(<ResourcesView />)
      for (const item of items) {
        await userEvent.click(screen.getByRole('row', { name: new RegExp(item.name) }))
        view.rerender(<ResourcesView />)
        expect(screen.getByRole('heading', { name: item.name })).toHaveFocus()
      }
      expect(navigateMock.mock.calls.map(([options]) => options)).toEqual([
        { to: '/resources/items/42' },
        { to: '/resources/items/43', replace: true },
        { to: '/resources/items/44', replace: true },
      ])
      expect(visitedPaths).toEqual(['/resources/items', '/resources/items/44'])

      act(() =>
        onResize?.([{ contentRect: { width: 375 } } as ResizeObserverEntry], {} as ResizeObserver),
      )
      expect(screen.queryByRole('searchbox')).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'Back to items' }))
      expect(back).toHaveBeenCalledOnce()
      view.rerender(<ResourcesView />)
      expect(visitedPaths).toEqual(['/resources/items'])
      expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument()
      expect(screen.queryByRole('region', { name: 'Item details' })).toBeNull()
    } finally {
      back.mockRestore()
      navigateMock.mockReset()
      vi.stubGlobal('ResizeObserver', previousResizeObserver)
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('keeps deep-link closing behavior after selecting a list row', async () => {
    const previousWidth = window.innerWidth
    const previousResizeObserver = globalThis.ResizeObserver
    let onResize: ResizeObserverCallback | undefined
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe(element: Element): void {
          if (element.classList.contains('resources-body')) onResize = this.callback
        }
        unobserve(): void {}
        disconnect(): void {}
      },
    )
    itemPageQueryState = {
      data: {
        total: 2,
        items: [ITEM_SUMMARIES[0], { ...ITEM_SUMMARIES[0], id: 43, name: 'Heartstone' }],
      },
      isPending: false,
      isFetching: false,
      error: null,
    }
    mockRouteParams = { category: 'items', id: '42' }
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    try {
      const view = render(<ResourcesView />)
      await userEvent.click(screen.getByRole('row', { name: /Heartstone/ }))
      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/43', replace: true })
      mockRouteParams = { category: 'items', id: '43' }
      view.rerender(<ResourcesView />)
      act(() =>
        onResize?.([{ contentRect: { width: 375 } } as ResizeObserverEntry], {} as ResizeObserver),
      )
      expect(screen.queryByRole('searchbox')).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'Back to items' }))
      expect(navigateMock).toHaveBeenLastCalledWith({ to: '/resources/items', replace: true })
      expect(back).not.toHaveBeenCalled()
    } finally {
      back.mockRestore()
      vi.stubGlobal('ResizeObserver', previousResizeObserver)
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('shows only the detail after narrow navigation and restores the list on Back', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    try {
      const view = render(<ResourcesView />)
      const search = screen.getByRole('searchbox', { name: 'Search items' })
      await userEvent.type(search, 'Blood')
      const listBody = view.container.querySelector<HTMLElement>('.ledger-body')
      if (listBody) {
        listBody.scrollTop = 120
        fireEvent.scroll(listBody)
        expect(listBody.scrollTop).toBe(120)
      }
      await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/42' })

      mockRouteParams = { category: 'items', id: '42' }
      view.rerender(<ResourcesView />)
      expect(screen.queryByRole('searchbox')).toBeNull()
      expect(screen.getByRole('region', { name: 'Item details' })).toBeInTheDocument()

      mockRouteParams = { category: 'items' }
      view.rerender(<ResourcesView />)
      expect(screen.getByRole('searchbox', { name: 'Search items' })).toHaveValue('Blood')
      expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
      if (listBody)
        expect(view.container.querySelector('.ledger-body')).toHaveProperty('scrollTop', 120)
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('uses browser history on narrow close and focuses the row after delayed list loading', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
    try {
      const view = render(<ResourcesView />)
      await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
      mockRouteParams = { category: 'items', id: '42' }
      view.rerender(<ResourcesView />)
      await userEvent.click(screen.getByRole('button', { name: 'Back to items' }))
      expect(back).toHaveBeenCalledOnce()
      expect(navigateMock).toHaveBeenCalledTimes(1)

      itemPageQueryState = { data: undefined, isPending: true, isFetching: true, error: null }
      mockRouteParams = { category: 'items' }
      view.rerender(<ResourcesView />)
      expect(screen.queryByRole('row', { name: /Bloodstone/ })).toBeNull()
      expect(view.container.querySelector('.resources-picker')).toHaveFocus()

      itemPageQueryState = {
        data: { total: 1, items: ITEM_SUMMARIES },
        isPending: false,
        isFetching: false,
        error: null,
      }
      view.rerender(<ResourcesView />)
      expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    } finally {
      back.mockRestore()
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('uses one column minimum for the CSS grid and takeover decision', () => {
    const previousWidth = window.innerWidth
    const previousResizeObserver = globalThis.ResizeObserver
    let onResize: ResizeObserverCallback | undefined
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1024 })
    vi.stubGlobal(
      'ResizeObserver',
      class {
        private callback: ResizeObserverCallback
        constructor(callback: ResizeObserverCallback) {
          this.callback = callback
        }
        observe(element: Element): void {
          if (element.classList.contains('resources-body')) onResize = this.callback
        }
        unobserve(): void {}
        disconnect(): void {}
      },
    )
    try {
      mockRouteParams = { category: 'items', id: '42' }
      const view = render(<ResourcesView />)
      const body = view.container.querySelector<HTMLElement>('.resources-body')!
      expect(body.style.getPropertyValue('--resources-column-min-width')).toBe('480px')
      act(() =>
        onResize?.([{ contentRect: { width: 900 } } as ResizeObserverEntry], {} as ResizeObserver),
      )
      expect(view.container.querySelector('.resources-picker')).toBeNull()
      act(() =>
        onResize?.([{ contentRect: { width: 1100 } } as ResizeObserverEntry], {} as ResizeObserver),
      )
      expect(view.container.querySelector('.resources-picker')).not.toBeNull()
    } finally {
      vi.stubGlobal('ResizeObserver', previousResizeObserver)
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('renders a deep-linked narrow detail and returns to the list', async () => {
    const previousWidth = window.innerWidth
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 375 })
    try {
      mockRouteParams = { category: 'items', id: '42' }
      render(<ResourcesView />)
      expect(screen.queryByRole('searchbox')).toBeNull()
      await userEvent.click(screen.getByRole('button', { name: 'Back to items' }))
      expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items', replace: true })
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
  })

  it('renders one detail card within the pane', () => {
    mockRouteParams = { category: 'items', id: '42' }
    const { container } = render(<ResourcesView />)
    expect(container.querySelectorAll('.resources-detail-pane .detail-card')).toHaveLength(1)
    expect(container.querySelector('.resources-detail-pane .detail-card')).toHaveClass(
      'detail-card--pane',
    )
  })

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
