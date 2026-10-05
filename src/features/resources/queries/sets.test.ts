import { afterEach, expect, it, vi } from 'vitest'
import { apiErrorDescription, type ApiSetDetail } from '../../../lib/api'
import capturedSet from './fixtures/effects-set.json'
import capturedSetPage from './fixtures/sets-page.json'
import { fetchSet, fetchSetVocabulary, toSetDetail } from './sets'

afterEach(() => vi.unstubAllGlobals())

it('fetches all pages of matching set names in API order', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ ...capturedSetPage, limit: 1, sets: [capturedSetPage.sets[0]] }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...capturedSetPage,
          limit: 1,
          offset: 1,
          sets: [capturedSetPage.sets[1]],
        }),
      ),
    )
  vi.stubGlobal('fetch', fetchMock)
  expect(await fetchSetVocabulary('  Adherent  ')).toEqual({
    rows: capturedSetPage.sets.map((set) => set.name),
    total: 2,
  })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  const urls = fetchMock.mock.calls.map(([url]) => new URL(url as string))
  expect(urls.map((url) => url.searchParams.get('q'))).toEqual(['Adherent', 'Adherent'])
  expect(urls.map((url) => url.searchParams.get('offset'))).toEqual(['0', '1'])
})

it('rejects a set vocabulary page that ends before its declared total', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ ...capturedSetPage, sets: [] }))),
      ),
  )
  await expect(fetchSetVocabulary()).rejects.toMatchObject({ kind: 'api-response' })
})

it('reloads an incomplete set vocabulary page before treating it as a contract error', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ ...capturedSetPage, sets: [] })))
    .mockResolvedValueOnce(new Response(JSON.stringify(capturedSetPage)))
  vi.stubGlobal('fetch', fetchMock)
  expect(await fetchSetVocabulary()).toEqual({
    rows: capturedSetPage.sets.map((set) => set.name),
    total: capturedSetPage.total,
  })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1]).toHaveProperty('cache', 'reload')
})

it('keeps captured set tier effects in owner order with their stat bonuses', () => {
  const set = toSetDetail(capturedSet as ApiSetDetail)
  expect(set.name).toBe('Devoted Heart')
  expect(set.tiers[0].equippedCount).toBe(2)
  expect(set.tiers[0].effects[0]).toMatchObject({
    name: 'Positive Spell Power',
    verboseName: 'Equipment Positive Spell Power +36',
    bonuses: [{ statName: 'Positive Spell Power', bonusType: 'Equipment', value: 36 }],
  })
})

it('fetches the set detail and rejects a missing effect list', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(capturedSet)))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...capturedSet,
          tiers: [{ ...capturedSet.tiers[0], effects: undefined }],
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...capturedSet,
          tiers: [{ ...capturedSet.tiers[0], effects: undefined }],
        }),
      ),
    )
  vi.stubGlobal('fetch', fetchMock)
  expect((await fetchSet(capturedSet.id)).tiers[0].effects).toHaveLength(1)
  await expect(fetchSet(capturedSet.id)).rejects.toMatchObject({ kind: 'api-response' })
})

it('reports a malformed set tier with its path and field', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ...capturedSet,
            tiers: [capturedSet.tiers[0], { ...capturedSet.tiers[0], effects: null }],
          }),
        ),
      ),
    ),
  )
  const error = await fetchSet(capturedSet.id).catch((caught: unknown) => caught)
  expect(error).toMatchObject({
    kind: 'api-response',
    message: expect.stringContaining(`/v1/sets/${capturedSet.id}: tiers[1].effects`),
  })
  expect(apiErrorDescription(error).kind).toBe('our-bug')
})

it('names the set tier field when a tier reaches the mapper without effects', () => {
  expect(() =>
    toSetDetail({ ...capturedSet, tiers: [{ ...capturedSet.tiers[0], effects: null }] } as never),
  ).toThrow(`/v1/sets/${capturedSet.id}: tiers[0].effects`)
})
