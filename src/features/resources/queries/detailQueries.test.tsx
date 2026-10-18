import { afterEach, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import {
  QueryClient,
  QueryClientProvider,
  type QueryKey,
  type FetchQueryOptions,
  type UseQueryResult,
} from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiFixture } from '../../../test/apiFixture'
import * as queries from './useItems'
import item from './fixtures/item-stolen-necklace-level-25.json'
import set from './fixtures/set-devoted-heart.json'
import augment from './fixtures/augment-solar-gem-of-physical-resistance-rating-heroic.json'
import effect from './fixtures/effect-strength.json'
import quest from './fixtures/quest-death-house.json'
import adventurePack from './fixtures/adventure-pack-magic-of-myth-drannor.json'
import questChain from './fixtures/quest-chain-the-lost-seekers.json'
import saga from './fixtures/saga-the-haunting-of-saltmarsh.json'
import craftingSystem from './fixtures/crafting-system-slave-lords-crafting.json'
import vendor from '../../../test/fixtures/vendor-morten-edgewright.json'
import event from './fixtures/event-treasure-of-crystal-cove.json'
import type { Slug } from '../../../lib/api'
import type { SourceDetailKind } from './sources'

afterEach(() => vi.restoreAllMocks())

const sourceCases = [
  ['adventurePack', adventurePack, queries.useAdventurePack],
  ['questChain', questChain, queries.useQuestChain],
  ['saga', saga, queries.useSaga],
  ['craftingSystem', craftingSystem, queries.useCraftingSystem],
  ['vendor', vendor, queries.useVendor],
  ['event', event, queries.useEvent],
] as const

const detailCase = <Result, Key extends QueryKey>(
  kind: string,
  capture: { slug: string },
  options: (slug: Slug) => FetchQueryOptions<Result, Error, Result, Key>,
  useDetail: (slug: Slug) => UseQueryResult<Result>,
): {
  kind: string
  capture: { slug: string }
  slug: Slug
  useDetail: (slug: Slug) => UseQueryResult<Result>
  queryKey: Key
  prefetch: (client: QueryClient) => Promise<void>
  isReady: (client: QueryClient) => boolean
} => {
  const slug = apiFixture(capture).slug
  return {
    kind,
    capture,
    slug,
    useDetail,
    queryKey: options(slug).queryKey,
    prefetch: (client: QueryClient) => client.prefetchQuery(options(slug)),
    isReady: (client: QueryClient) => queries.isDetailQueryReady(client, options(slug)),
  }
}

const detailCases = [
  detailCase('set', set, queries.setDetailQueryOptions, queries.useSet),
  detailCase('augment', augment, queries.augmentDetailQueryOptions, queries.useAugment),
  detailCase('effect', effect, queries.effectDetailQueryOptions, queries.useEffectDetail),
  detailCase('quest', quest, queries.questDetailQueryOptions, queries.useQuest),
  ...sourceCases.map(([kind, capture, useDetail]) =>
    detailCase(
      kind,
      capture,
      (slug: Slug) => queries.sourceDetailQueryOptions(kind satisfies SourceDetailKind, slug),
      useDetail,
    ),
  ),
]

it.each(detailCases)(
  '$kind prefetch, readiness and hook use the same slug key',
  async ({ capture, slug, prefetch, isReady, queryKey, useDetail }) => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async () => new Response(JSON.stringify(capture)))
    const client = new QueryClient()
    expect(isReady(client)).toBe(false)
    await prefetch(client)
    expect(isReady(client)).toBe(true)
    const { result, unmount } = renderHook(() => useDetail(slug), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(
      client
        .getQueryCache()
        .getAll()
        .map((query) => query.queryKey),
    ).toEqual([queryKey])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    unmount()
    client.clear()
  },
)

it('item prefetch, readiness and hook use the same slug key', async () => {
  const slug = apiFixture(item).slug
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(async () => new Response(JSON.stringify(item)))
  const client = new QueryClient()
  expect(queries.isItemCardReady(client, slug)).toBe(false)
  await queries.prefetchItemCard(client, slug)
  expect(queries.isItemCardReady(client, slug)).toBe(true)
  const { result, unmount } = renderHook(() => queries.useItem(slug), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(
    client
      .getQueryCache()
      .getAll()
      .map((query) => query.queryKey),
  ).toEqual([['items', 'detail', slug]])
  expect(fetchMock).toHaveBeenCalledTimes(1)
  unmount()
  client.clear()
})
