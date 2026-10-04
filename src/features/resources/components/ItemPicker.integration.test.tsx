import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ItemPicker } from './ItemPicker'
import { EMPTY_ITEM_FILTERS, type ItemListFilters } from '../queries/items'

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ItemPicker page errors', () => {
  it('requests only items on mount and loads each vocabulary when its picker opens', async () => {
    let finishSlots: ((response: Response) => void) | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const path = new URL(String(request)).pathname
      if (path === '/v1/equipment-slots') {
        return new Promise<Response>((resolve) => {
          finishSlots = resolve
        })
      }
      const responses: Record<string, unknown> = {
        '/v1/items': { total: 0, limit: 200, offset: 0, items: [] },
        '/v1/enchantments': {
          total: 1,
          limit: 10000,
          offset: 0,
          enchantments: [{ name: 'Strength', kind: 'stat', item_count: 1 }],
        },
        '/v1/adventure-packs': {
          total: 1,
          limit: 10000,
          offset: 0,
          adventure_packs: [{ id: 1, name: 'Vault of Night', is_free_to_play: false }],
        },
        '/v1/quests': {
          total: 1,
          limit: 10000,
          offset: 0,
          quests: [{ id: 7, name: 'The Raid', pack: null, is_raid: true }],
        },
      }
      return Promise.resolve(new Response(JSON.stringify(responses[path]), { status: 200 }))
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('0 results')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([request]) => new URL(String(request)).pathname)).toEqual([
      '/v1/items',
    ])
    await userEvent.click(screen.getByRole('button', { name: 'Gear slot' }))
    expect(screen.getByText('Loading options…')).toHaveAttribute('role', 'status')
    expect(fetchMock.mock.calls.map(([request]) => new URL(String(request)).pathname)).toEqual([
      '/v1/items',
      '/v1/equipment-slots',
    ])
    finishSlots?.(
      new Response(
        JSON.stringify({
          total: 1,
          limit: 10000,
          offset: 0,
          equipment_slots: [{ id: 1, name: 'Trinket', sort_order: 1, category: 'Jewelry' }],
        }),
        { status: 200 },
      ),
    )
    expect(await screen.findByRole('option', { name: 'Trinket' })).toBeInTheDocument()
    for (const [picker, endpoint, option] of [
      ['Enchantments', '/v1/enchantments', 'Strength'],
      ['Pack', '/v1/adventure-packs', 'Vault of Night'],
      ['Raid', '/v1/quests', 'The Raid'],
    ]) {
      await userEvent.click(screen.getByRole('button', { name: picker }))
      expect(await screen.findByRole('option', { name: option })).toBeInTheDocument()
      expect(new URL(String(fetchMock.mock.lastCall?.[0])).pathname).toBe(endpoint)
    }
  })

  it('keeps the filter controls available after a loaded page is followed by a 400', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const url = new URL(String(request))
      if (url.pathname === '/v1/items') {
        if (url.searchParams.has('enchantment')) {
          return Promise.resolve(new Response('Unknown enchantment', { status: 400 }))
        }
        return Promise.resolve(
          new Response(
            JSON.stringify({
              total: 1,
              limit: 200,
              offset: 0,
              items: [
                {
                  id: 1,
                  name: 'Bloodstone',
                  slot: 'Trinket',
                  category: 'Jewelry',
                  item_type: null,
                  minimum_level: 12,
                  enhancement_bonus: null,
                  icon: null,
                  pack: 'Vault of Night',
                  is_raid: false,
                  is_rare: false,
                  is_legacy: false,
                },
              ],
            }),
            { status: 200 },
          ),
        )
      }
      const vocabulary: Record<string, unknown> = {
        '/v1/enchantments': {
          total: 1,
          limit: 10000,
          offset: 0,
          enchantments: [{ name: 'Bad Filter', kind: 'stat', item_count: 1 }],
        },
        '/v1/equipment-slots': {
          total: 1,
          limit: 10000,
          offset: 0,
          equipment_slots: [{ id: 1, name: 'Trinket', sort_order: 1, category: 'Jewelry' }],
        },
        '/v1/adventure-packs': {
          total: 1,
          limit: 10000,
          offset: 0,
          adventure_packs: [{ id: 1, name: 'Vault of Night', is_free_to_play: false }],
        },
        '/v1/quests': { total: 0, limit: 10000, offset: 0, quests: [] },
      }
      return Promise.resolve(
        new Response(JSON.stringify(vocabulary[url.pathname]), { status: 200 }),
      )
    })
    const queryClient = new QueryClient()
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={queryClient}>
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('1 result')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Enchantments' }))
    await user.click(screen.getByRole('option', { name: 'Bad Filter' }))
    expect(await screen.findByText('Could not load filters.')).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Enchantments' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show applied · 1' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(screen.queryByText('1 result')).toBeNull()
    expect(screen.queryByText('The game data API returned 400')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(await screen.findByText('1 result')).toBeInTheDocument()
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([request]) => new URL(String(request)).pathname === '/v1/items',
        ),
      ).toHaveLength(2),
    )
  })

  it('offers Reset match when the All request returns 400', async () => {
    const itemRequests: URL[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const url = new URL(String(request))
      if (url.pathname === '/v1/enchantments') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              total: 2,
              limit: 10000,
              offset: 0,
              enchantments: [
                { name: 'Strength', kind: 'stat', item_count: 1 },
                { name: 'Vorpal', kind: 'effect', item_count: 1 },
              ],
            }),
            { status: 200 },
          ),
        )
      }
      itemRequests.push(url)
      if (url.searchParams.get('enchantment_match') === 'all') {
        return Promise.resolve(new Response('Unknown enchantment_match', { status: 400 }))
      }
      return Promise.resolve(
        new Response(JSON.stringify({ total: 0, limit: 200, offset: 0, items: [] }), {
          status: 200,
        }),
      )
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('0 results')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Enchantments' }))
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(itemRequests).toHaveLength(1)
    expect(itemRequests[0].searchParams.has('enchantment_match')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Reset match' })).toBeNull()
    await userEvent.click(await screen.findByRole('option', { name: 'Strength' }))
    await userEvent.click(screen.getByRole('option', { name: 'Vorpal' }))
    expect(itemRequests.at(-1)?.searchParams.getAll('enchantment')).toEqual(['Strength', 'Vorpal'])
    expect(itemRequests.at(-1)?.searchParams.get('enchantment_match')).toBe('all')
    expect(await screen.findByText('Could not load filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset match' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset match' }))
    expect(await screen.findByText('0 results')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reset match' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Enchantments' }))
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'true')
    expect(itemRequests.some((url) => url.searchParams.get('enchantment_match') === 'all')).toBe(
      true,
    )
  })

  it('keeps the headers and offers Reset sort after a sorted request returns 400', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const parameters = new URL(String(request)).searchParams
      if (parameters.has('sort')) {
        return Promise.resolve(new Response('Unknown sort', { status: 400 }))
      }
      return Promise.resolve(
        new Response(
          JSON.stringify({
            total: 1,
            limit: 200,
            offset: 0,
            items: [
              {
                id: 1,
                name: 'Bloodstone',
                slot: 'Trinket',
                category: 'Jewelry',
                item_type: null,
                minimum_level: 12,
                enhancement_bonus: null,
                icon: null,
                pack: null,
                is_raid: false,
                is_rare: false,
                is_legacy: false,
              },
            ],
          }),
          { status: 200 },
        ),
      )
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('1 result')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('columnheader', { name: 'ML' }))
    expect(await screen.findByText('Could not load sorted items.')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ML/ })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gear slot' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset sort' }))
    expect(await screen.findByText('1 result')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.filter(([request]) => new URL(String(request)).searchParams.has('sort')),
    ).toHaveLength(1)
  })

  it('keeps controls available and retries an initial 400', async () => {
    let listRequests = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      listRequests += 1
      return Promise.resolve(
        listRequests === 1
          ? new Response('Rejected', { status: 400 })
          : new Response(JSON.stringify({ total: 0, limit: 200, offset: 0, items: [] }), {
              status: 200,
            }),
      )
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Could not load filters.')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('0 results')).toBeInTheDocument()
    expect(listRequests).toBe(2)
  })
})

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
