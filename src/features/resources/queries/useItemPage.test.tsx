import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { useItemPage, useFittingAugmentsBySlotLabel, useAdventurePack } from './useItems'
import { EMPTY_ITEM_FILTERS } from './items'
import adventurePack from './fixtures/adventure-packs.json'

function apiPage(name: string, total = 1): Response {
  return new Response(
    JSON.stringify({
      total,
      limit: 200,
      offset: 0,
      items: [
        {
          id: 1,
          name,
          slot: 'Trinket',
          category: 'Jewelry',
          item_type: null,
          minimum_level: 20,
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
  )
}

function QueryWrapper({ children }: { children: ReactNode }): ReactNode {
  const [queryClient] = useState(() => new QueryClient())
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

afterEach(() => vi.restoreAllMocks())

it('fetches only the opened socket label and reuses it after closing', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ augments: [], total: 0, limit: 10000, offset: 0 }), {
      status: 200,
    }),
  )
  const { rerender } = renderHook(({ label }) => useFittingAugmentsBySlotLabel(label), {
    initialProps: { label: null as string | null },
    wrapper: QueryWrapper,
  })
  expect(fetchMock).not.toHaveBeenCalled()
  rerender({ label: 'red' })
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
  rerender({ label: null })
  rerender({ label: 'red' })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  rerender({ label: 'sun' })
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  expect(
    fetchMock.mock.calls.map(([url]) => new URL(String(url)).searchParams.get('slot')),
  ).toEqual(['red', 'sun'])
})

it('reopens a cached source card without a second request', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(adventurePack), { status: 200 }))
  const queryClient = new QueryClient()
  function CachedWrapper({ children }: { children: ReactNode }): ReactNode {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
  const first = renderHook(() => useAdventurePack(2), { wrapper: CachedWrapper })
  await waitFor(() => expect(first.result.current.data?.name).toBe('Magic of Myth Drannor'))
  first.unmount()
  const second = renderHook(() => useAdventurePack(2), { wrapper: CachedWrapper })
  expect(second.result.current.data?.name).toBe('Magic of Myth Drannor')
  expect(fetchMock).toHaveBeenCalledOnce()
})

describe('useItemPage', () => {
  it('requests 200 rows per page, appends in API order, and restarts on sort', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const params = new URL(String(request)).searchParams
      const offset = Number(params.get('offset'))
      return Promise.resolve(apiPage(`${params.get('sort') ?? 'default'} at ${offset}`, 201))
    })
    const { result, rerender } = renderHook(
      ({ sort }) => useItemPage(EMPTY_ITEM_FILTERS, '', false, sort),
      {
        initialProps: { sort: null as { key: string; direction: 'asc' | 'desc' } | null },
        wrapper: QueryWrapper,
      },
    )
    await waitFor(() => expect(result.current.data?.pages[0].total).toBe(201))
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.get('limit')).toBe('200')
    expect(new URL(String(fetchMock.mock.calls[0][0])).searchParams.has('sort')).toBe(false)
    expect(result.current.hasNextPage).toBe(true)
    await result.current.fetchNextPage()
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2))
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('offset')).toBe('200')
    expect(result.current.data?.pages.map((page) => page.items[0].name)).toEqual([
      'default at 0',
      'default at 200',
    ])
    rerender({ sort: { key: 'ml', direction: 'desc' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    const sortedParams = new URL(String(fetchMock.mock.calls[2][0])).searchParams
    expect(sortedParams.getAll('sort')).toEqual(['-minimum_level'])
    expect(sortedParams.has('order')).toBe(false)
    expect(sortedParams.get('offset')).toBe('0')
  })
  it('makes one request per parameter set and keeps prior rows visible while the next page loads', async () => {
    let resolveNextPage: ((response: Response) => void) | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const requestedUrl = new URL(String(url))
      if (requestedUrl.searchParams.has('rare')) {
        return new Promise<Response>((resolve) => {
          resolveNextPage = resolve
        })
      }
      return Promise.resolve(apiPage('Old item', 40))
    })
    const { result, rerender } = renderHook(({ filters }) => useItemPage(filters, '', false), {
      initialProps: { filters: EMPTY_ITEM_FILTERS },
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.data?.pages[0].total).toBe(40))
    expect(fetchMock).toHaveBeenCalledOnce()
    rerender({ filters: { ...EMPTY_ITEM_FILTERS, isRareOnly: true } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    expect(result.current.data?.pages[0].items[0].name).toBe('Old item')
    expect(result.current.isPlaceholderData).toBe(true)
    expect(result.current.isFetching).toBe(true)
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get('rare')).toBe('true')
    resolveNextPage?.(apiPage('New item', 5))
    await waitFor(() => expect(result.current.data?.pages[0].items[0].name).toBe('New item'))
    expect(result.current.data?.pages[0].total).toBe(5)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('ignores a late page from the previous filter query', async () => {
    let finishOldPage: ((response: Response) => void) | undefined
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((request) => {
      const parameters = new URL(String(request)).searchParams
      if (parameters.has('rare')) return Promise.resolve(apiPage('Rare item'))
      if (parameters.get('offset') === '200') {
        return new Promise<Response>((resolve) => {
          finishOldPage = resolve
        })
      }
      return Promise.resolve(apiPage('Old item', 201))
    })
    const { result, rerender } = renderHook(({ filters }) => useItemPage(filters, '', false), {
      initialProps: { filters: EMPTY_ITEM_FILTERS },
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.data?.pages[0].items[0].name).toBe('Old item'))
    void result.current.fetchNextPage()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    rerender({ filters: { ...EMPTY_ITEM_FILTERS, isRareOnly: true } })
    await waitFor(() => expect(result.current.data?.pages[0].items[0].name).toBe('Rare item'))
    finishOldPage?.(apiPage('Stale item', 201))
    expect(result.current.data?.pages.map((page) => page.items[0].name)).toEqual(['Rare item'])
  })

  it('does not request set bonuses without an enchantment selection', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(apiPage('One item'))
    const { result, rerender } = renderHook(
      ({ includesSetBonuses }) => useItemPage(EMPTY_ITEM_FILTERS, '', includesSetBonuses),
      { initialProps: { includesSetBonuses: false }, wrapper: QueryWrapper },
    )
    await waitFor(() => expect(result.current.data?.pages[0].total).toBe(1))
    rerender({ includesSetBonuses: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    { name: '400', body: 'Unknown enchantment', status: 400, kind: 'api-http' },
    {
      name: 'invalid envelope',
      body: JSON.stringify({ total: 0, limit: 200, offset: 0, augments: [] }),
      status: 200,
      kind: 'api-response',
    },
  ])('shows a $name error after one request without retrying', async ({ body, status, kind }) => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(body, { status }))
    const { result } = renderHook(() => useItemPage(EMPTY_ITEM_FILTERS, '', false), {
      wrapper: QueryWrapper,
    })
    await waitFor(() => expect(result.current.error).toMatchObject({ name: 'ApiError', kind }))
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it.each([
    { name: 'network failure', failure: () => Promise.reject(new TypeError('Network down')) },
    {
      name: '429',
      failure: () => Promise.resolve(new Response('Rate limited', { status: 429 })),
    },
  ])('retries a $name and recovers', async ({ failure }) => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(failure)
      .mockResolvedValue(apiPage('Recovered item'))
    const { result } = renderHook(() => useItemPage(EMPTY_ITEM_FILTERS, '', false), {
      wrapper: QueryWrapper,
    })
    await waitFor(
      () => expect(result.current.data?.pages[0].items[0].name).toBe('Recovered item'),
      {
        timeout: 3500,
      },
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
