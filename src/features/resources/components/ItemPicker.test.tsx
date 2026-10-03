import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { ItemPicker } from './ItemPicker'
import { EMPTY_ITEM_FILTERS, type ItemListFilters, type ItemSummary } from '../queries/items'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))

function itemRow(overrides: Partial<ItemSummary> = {}): ItemSummary {
  return {
    id: 1,
    name: 'Bloodstone',
    equipmentSlot: 'Trinket',
    category: 'Jewelry',
    minimumLevel: 12,
    pack: 'Vault of Night',
    isRaidLoot: true,
    isRareLoot: false,
    isLegacy: false,
    ...overrides,
  }
}

const SAMPLE_ITEMS = [
  itemRow(),
  itemRow({ id: 2, name: 'Cloak of Night', equipmentSlot: 'Back', pack: 'Shadowfell' }),
  itemRow({ id: 3, name: 'Ring of Spell Storing', equipmentSlot: 'Ring', isRareLoot: true }),
]
let pageState: {
  data: { total: number; items: ItemSummary[] } | undefined
  isPending: boolean
  isFetching: boolean
  isPlaceholderData?: boolean
  fetchStatus?: 'idle' | 'fetching' | 'paused'
  error: Error | null
  isFetchNextPageError?: boolean
  isFetchingNextPage?: boolean
} = { data: { total: 93, items: SAMPLE_ITEMS }, isPending: false, isFetching: false, error: null }
const useItemPageMock = vi.fn((...request: [ItemListFilters, string, boolean, unknown]) => {
  void request
  return pageState
})
const fetchNextPageMock = vi.fn()

vi.mock('../queries/useItems', () => ({
  useItemPage: (
    filters: ItemListFilters,
    query: string,
    includesSetBonuses: boolean,
    sort: unknown,
  ) => {
    const state = useItemPageMock(filters, query, includesSetBonuses, sort)
    return {
      ...state,
      data: state.data ? { pages: [state.data], pageParams: [0] } : undefined,
      fetchNextPage: fetchNextPageMock,
    }
  },
  useEquipmentSlotNames: () => ({ data: ['Back', 'Ring', 'Trinket'] }),
  useEnchantmentNames: () => ({ data: ['Charisma', 'Strength', 'Vorpal'] }),
  useAdventurePackNames: () => ({ data: ['Shadowfell', 'Vault of Night'] }),
  useRaidQuests: () => ({
    data: [
      { id: 7, name: 'The Raid', pack: 'Vault of Night' },
      { id: 8, name: 'Empty Raid', pack: null },
    ],
  }),
}))

beforeEach(() => {
  vi.clearAllMocks()
  useItemPageMock.mockImplementation((...request) => {
    void request
    return pageState
  })
  fetchNextPageMock.mockClear()
  pageState = {
    data: { total: 93, items: SAMPLE_ITEMS },
    isPending: false,
    isFetching: false,
    error: null,
  }
})
afterEach(cleanup)

function renderItemPicker(): void {
  render(<ItemPickerHarness />)
}

function ItemPickerHarness(): React.JSX.Element {
  const [filters, setFilters] = useState<ItemListFilters>(EMPTY_ITEM_FILTERS)
  return (
    <ItemPicker
      category="items"
      selectedItemId={null}
      filters={filters}
      onFiltersChange={setFilters}
    />
  )
}

function latestFilters(): ItemListFilters {
  return useItemPageMock.mock.lastCall![0]
}

describe('ItemPicker server-backed filters', () => {
  it('shows chips and the response total', () => {
    renderItemPicker()
    const chipRow = document.querySelector('.filter-chip-row') as HTMLElement
    expect(
      within(chipRow)
        .getAllByRole('button')
        .map((button) => button.getAttribute('data-tip')),
    ).toEqual(['ML range', 'Gear slot', 'Enchantments', 'Pack', 'Raid', 'Rare only', 'Raid only'])
    expect(screen.getByText('93 results')).toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'items list' })).toBeInTheDocument()
  })

  it('shows a large response total without grouping separators', () => {
    pageState = {
      data: { total: 8084, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: false,
      error: null,
    }
    renderItemPicker()
    expect(screen.getByText('8084 results')).toBeInTheDocument()
  })

  it('renders Raid and Rare as static headers while other columns remain sortable', () => {
    renderItemPicker()
    for (const label of ['Raid', 'Rare']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(label) })
      expect(header).not.toHaveAttribute('aria-sort')
      expect(within(header).queryByRole('button')).toBeNull()
    }
    expect(screen.getByRole('button', { name: 'Sort Name' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sort ML' })).toBeInTheDocument()
  })

  it('does not label previous rows as results while a filtered retry is paused', async () => {
    const view = render(<ItemPickerHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    pageState = {
      data: { total: 93, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: false,
      isPlaceholderData: true,
      fetchStatus: 'paused',
      error: null,
    }
    view.rerender(<ItemPickerHarness />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.queryByText('93 results')).toBeNull()
  })

  it('passes slot, two enchantments, set bonuses, raid, range, rare and search to one page hook', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Gear slot' }))
    await user.click(screen.getByRole('option', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Enchantments' }))
    await user.click(screen.getByRole('option', { name: 'Strength' }))
    await user.click(screen.getByRole('option', { name: /Vorpal/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Include set bonuses' }))
    await user.click(screen.getByRole('button', { name: 'Enchantments' }))
    await user.click(screen.getByRole('button', { name: 'Raid' }))
    await user.click(screen.getByRole('option', { name: /The Raid/ }))
    await user.click(screen.getByRole('button', { name: 'ML range' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '20')
    await user.type(screen.getByRole('spinbutton', { name: 'Max ML' }), '32{Enter}')
    await user.click(screen.getByRole('button', { name: 'Rare only' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'torc' },
    })
    await waitFor(() => expect(useItemPageMock.mock.lastCall?.[1]).toBe('torc'))
    expect(latestFilters()).toEqual({
      ml: { min: '20', max: '32' },
      slot: 'Back',
      enchantments: ['Strength', 'Vorpal'],
      pack: '',
      raid: '7',
      isRareOnly: true,
      isRaidOnly: false,
    })
    expect(useItemPageMock.mock.lastCall?.[2]).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Show applied · 6' }))
    expect(
      Array.from(document.querySelectorAll('.filter-applied-label'), (label) => label.textContent),
    ).toEqual(['ML', 'Gear slot', 'Enchantments', 'Raid', 'Show'])
    await user.click(screen.getByRole('button', { name: 'Remove Gear slot: Back' }))
    expect(latestFilters().slot).toBe('')
  })

  it('keeps API order during search and sends header sorting to the page hook', async () => {
    pageState = {
      data: {
        total: 2,
        items: [
          itemRow({ id: 2, name: 'Torc of Prince Raiyum-de II' }),
          itemRow({ id: 1, name: '+3 Combustion Scorched Bastard Sword' }),
        ],
      },
      isPending: false,
      isFetching: false,
      error: null,
    }
    renderItemPicker()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'torc' },
    })
    await waitFor(() => expect(useItemPageMock.mock.lastCall?.[1]).toBe('torc'))
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Torc of Prince')
    await userEvent.click(screen.getByRole('button', { name: 'Sort Name' }))
    expect(useItemPageMock.mock.lastCall?.[3]).toEqual({ key: 'name', direction: 'asc' })
    expect(screen.getAllByRole('row')[1]).toHaveTextContent('Torc of Prince')
  })

  it('debounces rapid typing for at least 200ms before changing the page query', () => {
    vi.useFakeTimers()
    try {
      renderItemPicker()
      const search = screen.getByRole('searchbox', { name: 'Search items' })
      for (const query of ['r', 'ri', 'rin', 'ring']) {
        fireEvent.change(search, { target: { value: query } })
      }
      act(() => vi.advanceTimersByTime(199))
      expect(useItemPageMock.mock.lastCall?.[1]).toBe('')
      act(() => vi.advanceTimersByTime(51))
      expect(useItemPageMock.mock.lastCall?.[1]).toBe('ring')
      expect(new Set(useItemPageMock.mock.calls.map((request) => request[1]))).toEqual(
        new Set(['', 'ring']),
      )
    } finally {
      vi.useRealTimers()
    }
  })

  it('keeps prior rows visible while a new request loads', () => {
    const { rerender } = render(<ItemPickerHarness />)
    pageState = {
      data: { total: 93, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: true,
      error: null,
    }
    rerender(<ItemPickerHarness />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toBeInTheDocument()
  })

  it('keeps loaded rows and offers an inline retry when the next page fails', async () => {
    const view = render(<ItemPickerHarness />)
    pageState = {
      data: { total: 201, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: false,
      error: new Error('Page unavailable'),
      isFetchNextPageError: true,
    }
    view.rerender(<ItemPickerHarness />)
    expect(screen.getByText('201 results')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(fetchNextPageMock).toHaveBeenCalledOnce()
  })

  it('keeps the response total visible while another page loads', () => {
    const view = render(<ItemPickerHarness />)
    pageState = {
      data: { total: 201, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: true,
      isFetchingNextPage: true,
      error: null,
    }
    view.rerender(<ItemPickerHarness />)
    expect(screen.getByText('201 results')).toBeInTheDocument()
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toBeInTheDocument()
  })

  it('shows an empty raid as a normal empty result', async () => {
    useItemPageMock.mockImplementation((filters) =>
      filters.raid === '8'
        ? { data: { total: 0, items: [] }, isPending: false, isFetching: false, error: null }
        : pageState,
    )
    renderItemPicker()
    expect(screen.getByText('93 results')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Raid' }))
    await userEvent.click(screen.getByRole('option', { name: /Empty Raid/ }))
    expect(latestFilters().raid).toBe('8')
    expect(screen.getByText('0 results')).toBeInTheDocument()
    expect(screen.getByText('No items match your filters.')).toBeInTheDocument()
    expect(
      within(document.querySelector('.ledger-empty') as HTMLElement).getByRole('button', {
        name: 'Clear filters',
      }),
    ).toHaveClass('btn-ghost-sm')
  })

  it('opens the detail route from a ledger row', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/1' })
  })
})
