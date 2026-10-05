import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ItemPicker } from './ItemPicker'
import { resetResourceListSessionsForTests } from '../resourceListSessions'
import effectPage from '../queries/fixtures/effects-page.json'
import capturedSetPage from '../queries/fixtures/sets-page.json'
import type { ApiEffectVocabularyRow } from '../../../lib/api'

function vocabularyRow(name: string, kind: 'effect' | 'stat', id: number): ApiEffectVocabularyRow {
  return {
    ...effectPage.effects[0],
    id,
    name,
    kind,
    detail_path: `/v1/effects/${id}`,
  }
}

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  sessionStorage.clear()
  resetResourceListSessionsForTests()
})

function resourceResultCount(): HTMLElement {
  return document.querySelector<HTMLElement>('.resources-result-count')!
}

describe('ItemPicker page errors', () => {
  it('shows a failed filter vocabulary inside its picker instead of No matches', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const path = new URL(String(request)).pathname
      return Promise.resolve(
        path === '/v1/equipment-slots'
          ? new Response('Unknown endpoint', { status: 400 })
          : new Response(JSON.stringify({ total: 0, limit: 200, offset: 0, items: [] })),
      )
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent('0 results'))
    await userEvent.click(screen.getByRole('button', { name: 'Gear slot' }))
    expect(await screen.findByText('Could not load Gear slot options.')).toBeInTheDocument()
    expect(screen.queryByText('No matches.')).toBeNull()
    expect(document.querySelectorAll('.api-error-notice')).toHaveLength(1)
    expect(screen.getByRole('group', { name: 'Gear slot picker' })).toContainElement(
      screen.getByText('Could not load Gear slot options.'),
    )
    const report = screen.getByRole('link', { name: 'Report a bug' })
    expect(new URL(report.getAttribute('href') ?? '').searchParams.get('title')).toContain(
      '/v1/equipment-slots',
    )
  })

  it('names the failed Pack vocabulary in its open picker', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const path = new URL(String(request)).pathname
      return Promise.resolve(
        path === '/v1/adventure-packs' || path === '/v1/equipment-slots'
          ? new Response('Unknown endpoint', { status: 400 })
          : new Response(JSON.stringify({ total: 0, limit: 200, offset: 0, items: [] })),
      )
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent('0 results'))
    await userEvent.click(screen.getByRole('button', { name: 'Gear slot' }))
    expect(await screen.findByText('Could not load Gear slot options.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pack' }))
    expect(await screen.findByText('Could not load Pack options.')).toBeInTheDocument()
    expect(screen.queryByText('Could not load Gear slot options.')).toBeNull()
    expect(screen.queryByText('No matches.')).toBeNull()
    expect(document.querySelectorAll('.api-error-notice')).toHaveLength(1)
  })
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
        '/v1/effects': {
          total: 1,
          limit: 10000,
          offset: 0,
          effects: [vocabularyRow('Strength', 'stat', 1)],
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
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^0 results$/))
    expect(fetchMock.mock.calls.map(([request]) => new URL(String(request)).pathname)).toEqual([
      '/v1/items',
    ])
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.getAll('sort')).toEqual([
      '-minimum_level',
      'name',
    ])
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
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
      ['Bonuses', '/v1/effects', 'Strength'],
      ['Pack', '/v1/adventure-packs', 'Vault of Night'],
      ['Raid', '/v1/quests', 'The Raid'],
    ]) {
      await userEvent.click(screen.getByRole('button', { name: picker }))
      expect(await screen.findByRole('option', { name: new RegExp(option) })).toBeInTheDocument()
      expect(new URL(String(fetchMock.mock.lastCall?.[0])).pathname).toBe(endpoint)
    }
  })

  it('keeps the filter controls available after a loaded page is followed by a 400', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const url = new URL(String(request))
      if (url.pathname === '/v1/items') {
        if (url.searchParams.has('bonus')) {
          return Promise.resolve(new Response('Unknown bonus', { status: 400 }))
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
        '/v1/effects': {
          total: 1,
          limit: 10000,
          offset: 0,
          effects: [vocabularyRow('Bad Filter', 'stat', 2)],
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
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^1 result$/))
    await user.click(screen.getByRole('button', { name: 'Bonuses' }))
    await user.click(screen.getByRole('option', { name: /Bad Filter/ }))
    expect(await screen.findByText('Could not load Bonuses filter.')).toBeInTheDocument()
    const report = screen.getByRole('link', { name: 'Report a bug' })
    expect(new URL(report.getAttribute('href') ?? '').searchParams.get('body')).toContain(
      'Unknown bonus',
    )
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bonuses' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show applied · 1' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    expect(resourceResultCount()).toBeEmptyDOMElement()
    expect(screen.queryByText('The game data API returned 400')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Reset Bonuses filter' }))
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^1 result$/))
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter(
          ([request]) => new URL(String(request)).pathname === '/v1/items',
        ),
      ).toHaveLength(2),
    )
  })

  it('names and clears a rejected Set value while preserving other filters', async () => {
    const itemRequests: URL[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const url = new URL(String(request))
      if (url.pathname === '/v1/sets') {
        return Promise.resolve(new Response(JSON.stringify(capturedSetPage), { status: 200 }))
      }
      if (url.pathname === '/v1/adventure-packs') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              total: 1,
              limit: 10000,
              offset: 0,
              adventure_packs: [{ id: 1, name: 'Vault of Night', is_free_to_play: false }],
            }),
            { status: 200 },
          ),
        )
      }
      itemRequests.push(url)
      if (url.searchParams.has('set')) {
        return Promise.resolve(new Response('Unknown set value', { status: 400 }))
      }
      return Promise.resolve(
        new Response(JSON.stringify({ total: 1, limit: 200, offset: 0, items: [] }), {
          status: 200,
        }),
      )
    })
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ItemPickerHarness />
      </QueryClientProvider>,
    )
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^1 result$/))
    await userEvent.click(screen.getByRole('button', { name: 'Pack' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Vault of Night' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set' }))
    await userEvent.click(await screen.findByRole('option', { name: capturedSetPage.sets[0].name }))
    expect(await screen.findByText('Could not load Set filter.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset Set filter' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset Set filter' }))
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^1 result$/))
    await userEvent.click(screen.getByRole('button', { name: 'Show applied · 1' }))
    expect(screen.getByRole('button', { name: 'Remove Pack: Vault of Night' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove Set:/ })).not.toBeInTheDocument()
    expect(
      itemRequests.some(
        (url) =>
          !url.searchParams.has('set') &&
          url.searchParams.getAll('pack').join() === 'Vault of Night',
      ),
    ).toBe(true)
  })

  it('offers Reset match when the All request returns 400', async () => {
    const itemRequests: URL[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const url = new URL(String(request))
      if (url.pathname === '/v1/effects') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              total: 2,
              limit: 10000,
              offset: 0,
              effects: [vocabularyRow('Strength', 'stat', 1), vocabularyRow('Vorpal', 'effect', 2)],
            }),
            { status: 200 },
          ),
        )
      }
      itemRequests.push(url)
      if (url.searchParams.get('bonus_match') === 'all') {
        return Promise.resolve(new Response('Unknown bonus_match', { status: 400 }))
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
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^0 results$/))
    await userEvent.click(screen.getByRole('button', { name: 'Bonuses' }))
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(itemRequests).toHaveLength(1)
    expect(itemRequests[0].searchParams.has('bonus_match')).toBe(false)
    expect(screen.queryByRole('button', { name: 'Reset match' })).toBeNull()
    await userEvent.click(await screen.findByRole('option', { name: /Strength/ }))
    await userEvent.click(screen.getByRole('option', { name: /Vorpal/ }))
    expect(itemRequests.at(-1)?.searchParams.getAll('bonus')).toEqual(['Strength', 'Vorpal'])
    expect(itemRequests.at(-1)?.searchParams.get('bonus_match')).toBe('all')
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reset match' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset match' }))
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^0 results$/))
    expect(screen.queryByRole('button', { name: 'Reset match' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Bonuses' }))
    expect(screen.getByRole('button', { name: 'Any' })).toHaveAttribute('aria-pressed', 'true')
    expect(itemRequests.some((url) => url.searchParams.get('bonus_match') === 'all')).toBe(true)
  })

  it('keeps the headers and offers Reset sort after a sorted request returns 400', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const parameters = new URL(String(request)).searchParams
      if (parameters.get('sort') === 'minimum_level') {
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
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^1 result$/))
    await userEvent.click(screen.getByRole('columnheader', { name: 'ML' }))
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /ML/ })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search items' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gear slot' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reset sort' }))
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^1 result$/))
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.getAll('sort')).toEqual([
      '-minimum_level',
      'name',
    ])
    expect(screen.getByRole('columnheader', { name: 'ML' })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
    expect(
      fetchMock.mock.calls.filter(
        ([request]) => new URL(String(request)).searchParams.get('sort') === 'minimum_level',
      ),
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
    expect(await screen.findByText('Something went wrong on our side.')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: /Name/ })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(resourceResultCount()).toHaveTextContent(/^0 results$/))
    expect(listRequests).toBe(2)
  })
})

function ItemPickerHarness(): React.JSX.Element {
  return <ItemPicker category="items" selectedItemId={null} />
}
