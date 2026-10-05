import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import capturedGroups from '../queries/fixtures/effects-page-groups.json'
import capturedSetPage from '../queries/fixtures/sets-page.json'
import { ItemPicker } from './ItemPicker'
import { itemListParameters, type ItemListFilters, type ItemSummary } from '../queries/items'
import { resetResourceListSessionsForTests, useResourceListSession } from '../resourceListSessions'

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
  itemRow({
    id: 2,
    name: 'Cloak of Night',
    equipmentSlot: 'Back',
    pack: 'Shadowfell',
    isRaidLoot: false,
  }),
  itemRow({
    id: 3,
    name: 'Ring of Spell Storing',
    equipmentSlot: 'Ring',
    isRaidLoot: false,
    isRareLoot: true,
  }),
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
const EFFECT_ROWS = [
  {
    id: 1,
    name: 'Charisma',
    kind: 'stat',
    detail_path: '/v1/effects/1',
    item_count: 1,
    augment_count: 0,
    set_count: 0,
    bonus_types: [
      { name: 'Insightful', item_count: 1 },
      { name: 'Quality', item_count: 1 },
    ],
  },
  {
    id: 2,
    name: 'Strength',
    kind: 'stat',
    detail_path: '/v1/effects/2',
    item_count: 1,
    augment_count: 0,
    set_count: 0,
    bonus_types: [],
  },
  {
    id: 3,
    name: 'Vorpal',
    kind: 'effect',
    detail_path: '/v1/effects/3',
    item_count: 1,
    augment_count: 0,
    set_count: 0,
    bonus_types: [],
  },
]
function effectVocabularyPage(searchQuery: string): {
  data: { total: number; rows: typeof EFFECT_ROWS }
} {
  return {
    data: {
      total: 2162,
      rows: searchQuery
        ? EFFECT_ROWS.filter((row) => row.name.toLowerCase().includes(searchQuery.toLowerCase()))
        : EFFECT_ROWS,
    },
  }
}
const useEffectVocabularyMock = vi.fn(effectVocabularyPage)
const useSetVocabularyMock = vi.fn((searchQuery: string) => ({
  data: {
    rows: capturedSetPage.sets
      .filter((set) => set.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .map((set) => set.name),
    total: capturedSetPage.total,
  },
}))

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
  useEffectVocabulary: (searchQuery: string) => useEffectVocabularyMock(searchQuery),
  useSetVocabulary: (searchQuery: string) => useSetVocabularyMock(searchQuery),
  useAdventurePackNames: () => ({ data: ['Shadowfell', 'Vault of Night'] }),
  useRaidQuests: () => ({
    data: [
      { id: 7, name: 'The Raid', pack: 'Vault of Night' },
      { id: 8, name: 'Empty Raid', pack: null },
    ],
  }),
}))

beforeEach(() => {
  sessionStorage.clear()
  resetResourceListSessionsForTests()
  vi.clearAllMocks()
  useEffectVocabularyMock.mockImplementation(effectVocabularyPage)
  useSetVocabularyMock.mockClear()
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
  return <ItemPicker category="items" selectedItemId={null} />
}

function latestFilters(): ItemListFilters {
  return useItemPageMock.mock.lastCall![0]
}

function resourceResultCount(): HTMLElement {
  return document.querySelector<HTMLElement>('.resources-result-count')!
}

describe('ItemPicker server-backed filters', () => {
  it('shows chips and the response total', () => {
    renderItemPicker()
    const chipRow = document.querySelector('.filter-chip-row') as HTMLElement
    expect(
      within(chipRow)
        .getAllByRole('button')
        .map((button) => button.getAttribute('data-tip')),
    ).toEqual(['ML range', 'Gear slot', 'Bonuses', 'Set', 'Pack', 'Raid', 'Rare only', 'Raid only'])
    expect(
      screen.getByRole('button', { name: 'Minimum level' }).querySelector('.filter-chip-text'),
    ).toHaveTextContent('ML')
    expect(resourceResultCount()).toHaveTextContent(/^93 results$/)
    expect(resourceResultCount().closest('.filter-applied-toggle-row')).not.toBeNull()
    expect(screen.getByRole('table', { name: 'items list' })).toBeInTheDocument()
  })

  it('shows loot status only in the Raid and Rare cells', () => {
    renderItemPicker()
    for (const [name, raid, rare] of [
      ['Bloodstone', 'Yes', '—'],
      ['Cloak of Night', '—', '—'],
      ['Ring of Spell Storing', '—', 'Yes'],
    ]) {
      const cells = within(screen.getByRole('row', { name: new RegExp(name) })).getAllByRole('cell')
      expect(cells[0]).toHaveTextContent(name)
      expect(cells[0]).not.toHaveTextContent(/Raid|Rare/)
      expect(cells[0].querySelector('.resources-chip')).toBeNull()
      expect(cells[4]).toHaveTextContent(raid)
      expect(cells[5]).toHaveTextContent(rare)
    }
  })

  it('keeps the result count on the applied line with and without filters', async () => {
    const view = render(<ItemPickerHarness />)
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    const count = resourceResultCount()
    expect(count).toHaveTextContent(/^93 results$/)
    const appliedLine = count.closest('.filter-applied-toggle-row')
    expect(appliedLine).not.toBeNull()
    expect(appliedLine).not.toHaveTextContent('Show applied')
    expect(count).toHaveAttribute('aria-live', 'polite')
    expect(search).toHaveAttribute('aria-describedby', count.id)

    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    pageState = {
      data: { total: 1, items: [SAMPLE_ITEMS[2]] },
      isPending: false,
      isFetching: false,
      error: null,
    }
    view.rerender(<ItemPickerHarness />)
    const singularCount = resourceResultCount()
    expect(singularCount).toHaveTextContent(/^1 result$/)
    expect(singularCount.closest('.filter-applied-toggle-row')).toBe(appliedLine)
    expect(
      within(appliedLine as HTMLElement).getByRole('button', { name: 'Show applied · 1' }),
    ).toBeInTheDocument()
    expect(search).toHaveAttribute('aria-describedby', singularCount.id)
  })

  it('shows a large response total without grouping separators', () => {
    pageState = {
      data: { total: 8084, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: false,
      error: null,
    }
    renderItemPicker()
    expect(resourceResultCount()).toHaveTextContent(/^8084 results$/)
    expect(resourceResultCount().querySelector('.num')).toHaveTextContent('8084')
  })

  it('renders Raid and Rare as sortable headers that can still be focused and moved', () => {
    renderItemPicker()
    for (const label of ['Raid', 'Rare']) {
      const header = screen.getByRole('columnheader', { name: new RegExp(label) })
      expect(header).toHaveAttribute('aria-sort', 'none')
      expect(header).toHaveAttribute('aria-description', expect.stringContaining('M'))
    }
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
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
    expect(resourceResultCount()).toHaveTextContent('Loading…')
  })

  it('remembers scrolling while the next result set shows placeholder rows', async () => {
    const view = render(<ItemPickerHarness />)
    const session = renderHook(() => useResourceListSession('items'))
    const initialBody = view.container.querySelector<HTMLElement>('.ledger-body')!
    initialBody.scrollTop = 340
    fireEvent.scroll(initialBody)
    expect(session.result.current.scrollTop).toBe(340)

    pageState = {
      data: { total: 93, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: true,
      isPlaceholderData: true,
      error: null,
    }
    await userEvent.click(screen.getByRole('button', { name: 'Rare only' }))
    expect(screen.getByText('Loading…')).toBeInTheDocument()
    const placeholderBody = view.container.querySelector<HTMLElement>('.ledger-body')!
    placeholderBody.scrollTop = 224
    fireEvent.scroll(placeholderBody)
    expect(session.result.current.scrollTop).toBe(224)

    pageState = {
      data: { total: 1, items: [SAMPLE_ITEMS[2]] },
      isPending: false,
      isFetching: false,
      error: null,
    }
    view.rerender(<ItemPickerHarness />)
    expect(session.result.current.scrollTop).toBe(224)
  })

  it('passes slot, two bonuses, set bonuses, raid, range, rare and search to one page hook', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Gear slot' }))
    await user.click(screen.getByRole('option', { name: 'Back' }))
    await user.click(screen.getByRole('option', { name: 'Ring' }))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('option', { name: /Strength/ }))
    await user.click(screen.getByRole('option', { name: /Vorpal/ }))
    await user.click(screen.getByRole('checkbox', { name: 'Include set bonuses' }))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('button', { name: 'Raid' }))
    await user.click(screen.getByRole('option', { name: /The Raid/ }))
    await user.click(screen.getByRole('button', { name: 'Raid' }))
    await user.click(screen.getByRole('button', { name: 'Minimum level' }))
    await user.type(screen.getByRole('spinbutton', { name: 'Min ML' }), '20')
    await user.type(screen.getByRole('spinbutton', { name: 'Max ML' }), '32{Enter}')
    expect(screen.getByRole('button', { name: 'Minimum level: 20–32' })).toHaveTextContent('20–32')
    await user.click(screen.getByRole('button', { name: 'Rare only' }))
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search items' }), {
      target: { value: 'torc' },
    })
    await waitFor(() => expect(useItemPageMock.mock.lastCall?.[1]).toBe('torc'))
    expect(useItemPageMock.mock.lastCall?.[3]).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveAttribute('aria-sort', 'none')
    expect(latestFilters()).toEqual({
      ml: { min: '20', max: '32' },
      slot: ['Back', 'Ring'],
      bonuses: ['Strength', 'Vorpal'],
      bonusMatch: 'any',
      set: [],
      setMatch: 'any',
      pack: [],
      raid: ['7'],
      isRareOnly: true,
      isRaidOnly: false,
    })
    expect(useItemPageMock.mock.lastCall?.[2]).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Show applied · 7' }))
    expect(
      Array.from(document.querySelectorAll('.filter-applied-label'), (label) => label.textContent),
    ).toEqual(['ML', 'Gear slot', 'Bonuses · any', 'Raid', 'Show'])
    await user.click(screen.getByRole('button', { name: 'Remove Gear slot: Back' }))
    expect(latestFilters().slot).toEqual(['Ring'])
  }, 10000)

  it('shows match mode only for bonuses, labels applied values, and resets with Clear filters', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Gear slot' }))
    expect(screen.queryByRole('button', { name: 'All' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(latestFilters().bonusMatch).toBe('all')
    await user.click(screen.getByRole('option', { name: /Strength/ }))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('button', { name: 'Show applied · 1' }))
    expect(screen.getByText('Bonuses', { selector: '.filter-applied-label' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('option', { name: /Vorpal/ }))
    expect(screen.getByText('Bonuses · all')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(latestFilters().bonusMatch).toBe('any')
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('expands a stat into type choices and replaces Any type with a chosen type', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('option', { name: /Charisma.*Stat/ })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /Charisma.*Stat/ }))
    expect(latestFilters().bonuses).toEqual(['Charisma'])
    await user.hover(screen.getByRole('option', { name: /Charisma.*Stat/ }))
    await user.click(
      within(screen.getByRole('option', { name: /Charisma.*Stat/ })).getByText('Stat · Any type'),
    )
    await user.click(screen.getByRole('option', { name: /Charisma · Insightful/ }))
    expect(latestFilters().bonuses).toEqual(['Charisma:Insightful'])
    expect(itemListParameters(latestFilters(), '', false).bonus).toEqual(['Charisma:Insightful'])
    await user.click(screen.getByRole('option', { name: /Charisma.*Stat/ }))
    expect(latestFilters().bonuses).toEqual(['Charisma'])
  })

  it('lists a captured group by kind and sends its name as a bonus filter', async () => {
    const group = capturedGroups.effects.find((row) => row.kind === 'group')
    expect(group).toBeDefined()
    useEffectVocabularyMock.mockImplementation(() => ({
      data: { total: capturedGroups.total, rows: [group!, ...EFFECT_ROWS] },
    }))
    renderItemPicker()
    await userEvent.click(screen.getByRole('button', { name: 'Bonuses' }))
    await userEvent.click(screen.getByRole('option', { name: /Charisma Skills.*Group/ }))
    expect(itemListParameters(latestFilters(), '', false).bonus).toEqual(['Charisma Skills'])
  })

  it('chooses Constitution Insight through the pointer caption and sends its typed bonus', async () => {
    const constitution = {
      ...EFFECT_ROWS[0],
      id: 99,
      name: 'Constitution',
      detail_path: '/v1/effects/99',
      bonus_types: [{ name: 'Insight', item_count: 1 }],
    }
    useEffectVocabularyMock.mockImplementation((searchQuery) => ({
      data: {
        total: 2162,
        rows: searchQuery ? [] : [constitution, ...EFFECT_ROWS],
      },
    }))
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    const constitutionRow = screen.getByRole('option', { name: /Constitution.*Stat/ })
    await user.hover(constitutionRow)
    await user.click(within(constitutionRow).getByText('Stat · Any type'))
    expect(screen.getByRole('option', { name: /Constitution · Insight/ })).toBeInTheDocument()
    await user.click(within(constitutionRow).getByText('Stat · Any type'))
    expect(screen.queryByRole('option', { name: /Constitution · Insight/ })).toBeNull()
    await user.click(within(constitutionRow).getByText('Stat · Any type'))
    await user.click(screen.getByRole('option', { name: /Constitution · Insight/ }))
    expect(itemListParameters(latestFilters(), '', false).bonus).toEqual(['Constitution:Insight'])
  })

  it('keeps selected type labels during remote search and counts the full vocabulary', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(document.querySelector('.combobox-footer')).toHaveTextContent('3 of 2,162')
    await user.click(
      within(screen.getByRole('option', { name: /Charisma.*Stat/ })).getByText('Stat · Any type'),
    )
    await user.click(screen.getByRole('option', { name: /Charisma · Insightful/ }))
    await user.type(screen.getByRole('combobox', { name: 'Bonuses' }), 'vorpal')
    await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(1))
    expect(screen.getByRole('button', { name: 'Bonuses' })).toHaveAttribute(
      'data-tip',
      'Bonuses: Charisma · Insightful',
    )
    expect(document.querySelector('.combobox-footer')).toHaveTextContent('1 of 2,162')
    await user.click(screen.getByRole('button', { name: 'Show applied · 1' }))
    expect(
      screen.getByRole('button', { name: 'Remove Bonuses: Charisma · Insightful' }),
    ).toBeInTheDocument()
  })

  it('pins a selected bonus to the top when reopening its picker', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('option', { name: /Strength/ }))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getAllByRole('option')[0]).toHaveTextContent('Strength')
  })

  it('shows one type or N types on a selected stat', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('option', { name: /Charisma.*Stat/ }))
    await user.click(
      within(screen.getByRole('option', { name: /Charisma.*Stat/ })).getByText('Stat · Any type'),
    )
    await user.click(screen.getByRole('option', { name: /Charisma · Insightful/ }))
    expect(screen.getByRole('option', { name: /Charisma.*Stat.*Insightful/ })).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: /Charisma · Quality/ }))
    expect(latestFilters().bonuses).toEqual(['Charisma:Insightful', 'Charisma:Quality'])
    expect(screen.getByRole('option', { name: /Charisma.*Stat.*2 types/ })).toBeInTheDocument()
  })

  it('clears the remote search term when reopening Bonuses', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.type(screen.getByRole('combobox', { name: 'Bonuses' }), 'charisma')
    await waitFor(() => expect(useEffectVocabularyMock.mock.lastCall?.[0]).toBe('charisma'))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('combobox', { name: 'Bonuses' })).toHaveValue('')
    await waitFor(() => expect(useEffectVocabularyMock.mock.lastCall?.[0]).toBe(''))
  })

  it('does not offer Reset match for an error with no selected bonuses', async () => {
    const view = render(<ItemPickerHarness />)
    await userEvent.click(screen.getByRole('button', { name: 'Bonuses' }))
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    pageState = {
      data: { total: 93, items: SAMPLE_ITEMS },
      isPending: false,
      isFetching: false,
      error: new Error('Filter unavailable'),
    }
    view.rerender(<ItemPickerHarness />)
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset match' })).toBeNull()
  })

  it('lists each selected pack and raid in its applied group', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Pack' }))
    await user.click(screen.getByRole('option', { name: 'Shadowfell' }))
    await user.click(screen.getByRole('option', { name: 'Vault of Night' }))
    await user.click(screen.getByRole('button', { name: 'Raid' }))
    await user.click(screen.getByRole('option', { name: /The Raid/ }))
    await user.click(screen.getByRole('option', { name: /Empty Raid/ }))
    await user.click(screen.getByRole('button', { name: 'Raid' }))
    await user.click(screen.getByRole('button', { name: 'Show applied · 4' }))
    expect(latestFilters().pack).toEqual(['Shadowfell', 'Vault of Night'])
    expect(latestFilters().raid).toEqual(['7', '8'])
    expect(
      Array.from(document.querySelectorAll('.filter-applied-label'), (label) => label.textContent),
    ).toEqual(['Pack', 'Raid'])
    for (const name of ['Shadowfell', 'Vault of Night', 'The Raid', 'Empty Raid']) {
      expect(
        screen.getByRole('button', { name: new RegExp(`Remove (Pack|Raid): ${name}`) }),
      ).toBeInTheDocument()
    }
  })

  it('picks multiple sets by name and sends Set All through the item query', async () => {
    const user = userEvent.setup()
    renderItemPicker()
    await user.click(screen.getByRole('button', { name: 'Set' }))
    const setNames = capturedSetPage.sets.map((set) => set.name)
    for (const name of setNames) await user.click(screen.getByRole('option', { name }))
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(latestFilters().set).toEqual(setNames)
    expect(latestFilters().setMatch).toBe('all')
    const parameters = itemListParameters(latestFilters(), '', false)
    expect(parameters.set).toEqual(setNames)
    expect(parameters.set_match).toBe('all')
    await user.type(screen.getByRole('combobox', { name: 'Set' }), 'Legendary')
    await waitFor(() => expect(useSetVocabularyMock.mock.lastCall?.[0]).toBe('Legendary'))
    expect(screen.getByRole('option', { name: setNames[1] })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: setNames[0] })).toBeNull()
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
    await userEvent.click(screen.getByRole('columnheader', { name: 'Name' }))
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
    expect(resourceResultCount()).toHaveTextContent(/^201 results$/)
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
    expect(resourceResultCount()).toHaveTextContent(/^201 results$/)
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toBeInTheDocument()
  })

  it('shows an empty raid as a normal empty result', async () => {
    useItemPageMock.mockImplementation((filters) =>
      filters.raid.includes('8')
        ? { data: { total: 0, items: [] }, isPending: false, isFetching: false, error: null }
        : pageState,
    )
    renderItemPicker()
    expect(resourceResultCount()).toHaveTextContent(/^93 results$/)
    await userEvent.click(screen.getByRole('button', { name: 'Raid' }))
    await userEvent.click(screen.getByRole('option', { name: /Empty Raid/ }))
    expect(latestFilters().raid).toEqual(['8'])
    expect(resourceResultCount()).toHaveTextContent(/^0 results$/)
    expect(screen.getByText('No items match your filters.')).toBeInTheDocument()
    expect(
      within(document.querySelector('.ledger-empty') as HTMLElement).getByRole('button', {
        name: 'Clear filters',
      }),
    ).toHaveClass('btn-ghost-sm')
  })

  it('calls out a search-only empty result without a Clear filters action', async () => {
    pageState = { data: { total: 0, items: [] }, isPending: false, isFetching: false, error: null }
    renderItemPicker()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search items' }), 'nothing')
    expect(screen.getByText('No items match your search.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('opens the detail route from a ledger row', async () => {
    renderItemPicker()
    await userEvent.click(screen.getByRole('row', { name: /Bloodstone/ }))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/1' })
  })

  it('moves focus from search into rows and keeps it there on Escape without clearing the query', async () => {
    renderItemPicker()
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    await userEvent.type(search, 'ring')
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('row', { name: /Ring of Spell Storing/ })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}{ArrowUp}')
    expect(screen.getByRole('row', { name: /Cloak of Night/ })).toHaveFocus()
    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    expect(search).toHaveValue('ring')
    search.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(screen.getByRole('row', { name: /Ring of Spell Storing/ })).toHaveFocus()
  })

  it('opens the focused result on Enter while keeping row focus', async () => {
    renderItemPicker()
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    search.focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/2' })
    expect(search).not.toHaveFocus()
    expect(screen.getByRole('row', { name: /Cloak of Night/ })).toHaveFocus()
    await userEvent.keyboard('x')
    expect(search).toHaveValue('')
  })

  it('tabs from the header to one row and ignores vertical arrows on the header', async () => {
    renderItemPicker()
    const table = screen.getByRole('table', { name: 'items list' })
    const scrollBody = table.querySelector<HTMLElement>('.ledger-body')!
    expect(table).not.toHaveAttribute('tabindex')
    expect(scrollBody).not.toHaveAttribute('tabindex')
    expect(
      screen
        .getAllByRole('row')
        .filter((row) => row.classList.contains('ledger-row'))
        .filter((row) => row.tabIndex === 0),
    ).toHaveLength(1)
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    const header = screen.getByRole('columnheader', { name: 'Name' })
    header.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(header).toHaveFocus()
    await userEvent.tab()
    const row = screen.getByRole('row', { name: /Bloodstone/ })
    expect(row).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    expect(screen.getByRole('row', { name: /Cloak of Night/ })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(navigateMock).toHaveBeenCalledWith({ to: '/resources/items/2' })
    expect(search).not.toHaveFocus()
  })

  it('does not navigate when results disappear and clears Escape in the search', async () => {
    const view = render(<ItemPickerHarness />)
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    search.focus()
    pageState = {
      data: { total: 0, items: [] },
      isPending: false,
      isFetching: false,
      error: null,
    }
    view.rerender(<ItemPickerHarness />)
    await userEvent.keyboard('{Enter}{ArrowDown}')
    expect(search).toHaveFocus()
    expect(navigateMock).not.toHaveBeenCalled()
    expect(search).not.toHaveAttribute('aria-controls')
    expect(search).not.toHaveAttribute('aria-activedescendant')
    await userEvent.type(search, 'missing')
    await userEvent.keyboard('{Escape}')
    expect(search).toHaveValue('')
  })

  it('clears search text with Escape only when focus is in the search', async () => {
    renderItemPicker()
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    await userEvent.type(search, 'ring')
    await userEvent.keyboard('{ArrowDown}{Escape}')
    expect(search).toHaveValue('ring')
    expect(screen.getByRole('row', { name: /Bloodstone/ })).toHaveFocus()
    search.focus()
    await userEvent.keyboard('{Escape}')
    expect(search).toHaveValue('')
  })

  it('keeps aria-controls on the scroll body without aria-activedescendant', async () => {
    renderItemPicker()
    const search = screen.getByRole('searchbox', { name: 'Search items' })
    const scrollBody = document.querySelector<HTMLElement>('.ledger-body')!
    expect(scrollBody).toHaveAttribute('role', 'rowgroup')
    expect(search).toHaveAttribute('aria-controls', scrollBody.id)
    expect(search).not.toHaveAttribute('aria-activedescendant')
    search.focus()
    await userEvent.keyboard('{ArrowDown}')
    const focusedRow = screen.getByRole('row', { name: /Bloodstone/ })
    expect(focusedRow).toHaveFocus()
    expect(search).not.toHaveAttribute('aria-activedescendant')
    expect(scrollBody.contains(focusedRow)).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(focusedRow).toHaveFocus()
    expect(search).not.toHaveAttribute('aria-activedescendant')
  })
})
