import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, cleanup, fireEvent } from '@testing-library/react'
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
  useFittingAugmentsBySlotLabel: () => ({ data: [], isPending: false, error: null }),
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

  it('keeps focus on the opened row after Enter beside the detail', async () => {
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
      expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
      expect(screen.getByRole('heading', { name: 'Bloodstone' })).not.toHaveFocus()
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: previousWidth })
    }
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
      expect(document.body).toHaveFocus()

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
