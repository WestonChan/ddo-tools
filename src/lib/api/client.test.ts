import { describe, it, expect, expectTypeOf, vi, afterEach } from 'vitest'
import {
  API_BASE_URL,
  fetchApiJson,
  fetchApiPage,
  apiUrl,
  API_HTTP_ERROR,
  API_NETWORK_ERROR,
  API_TIMEOUT_ERROR,
  API_RESPONSE_ERROR,
  ApiError,
  apiErrorDescription,
  isApiError,
} from './client'
import { githubIssueUrls } from '../githubIssue'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apiUrl', () => {
  it('drops empty, undefined and false query values and encodes the rest', () => {
    expect(
      apiUrl('/v1/items', { q: 'a b', limit: 10, raid: false, pack: '', slot: undefined }),
    ).toBe(`${API_BASE_URL}/v1/items?q=a+b&limit=10`)
    expect(apiUrl('/v1/items', { raid: true })).toBe(`${API_BASE_URL}/v1/items?raid=true`)
    expect(apiUrl('/v1/version')).toBe(`${API_BASE_URL}/v1/version`)
  })

  it('appends repeated enchantments and sort keys in order, preserving commas and dropping empty values', () => {
    const url = new URL(
      apiUrl('/v1/items', {
        enchantment: ['Strength', '', 'Constitution Poison, Lesser'],
        sort: ['-name', 'minimum_level'],
      }),
    )
    expect(url.searchParams.getAll('enchantment')).toEqual([
      'Strength',
      'Constitution Poison, Lesser',
    ])
    expect(url.searchParams.getAll('sort')).toEqual(['-name', 'minimum_level'])
    expect(apiUrl('/v1/items', { enchantment: [], sort: [''] })).toBe(`${API_BASE_URL}/v1/items`)
  })

  it('always has an origin, so an unset VITE_API_URL still reaches the public API', () => {
    expect(API_BASE_URL).toMatch(/^https?:\/\//)
    expect(API_BASE_URL.endsWith('/')).toBe(false)
  })
})

describe('fetchApiPage', () => {
  it.each(['items', 'equipment_slots'] as const)(
    'extracts typed rows and metadata from the %s key',
    async (rowsKey) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(
          JSON.stringify({
            total: 202,
            limit: 200,
            offset: 200,
            [rowsKey]: [
              { id: 9, name: 'Zed' },
              { id: 7, name: 'Abe' },
            ],
          }),
        ),
      )
      const page = await fetchApiPage<{ id: number; name: string }, typeof rowsKey>(
        '/v1/catalog',
        rowsKey,
        { limit: 200, offset: 200 },
      )
      expectTypeOf(page.rows).toEqualTypeOf<{ id: number; name: string }[]>()
      expect(page).toEqual({
        total: 202,
        limit: 200,
        offset: 200,
        rows: [
          { id: 9, name: 'Zed' },
          { id: 7, name: 'Abe' },
        ],
      })
      expect(vi.mocked(fetch)).toHaveBeenCalledOnce()
      const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]))
      expect(Object.fromEntries(url.searchParams)).toEqual({ limit: '200', offset: '200' })
    },
  )

  it.each([
    { requestedLimit: 1, total: 0, limit: 1, offset: 0, items: [] },
    { requestedLimit: 200, total: 3, limit: 200, offset: 200, items: [] },
    { requestedLimit: 20000, total: 10001, limit: 10000, offset: 10000, items: [{ id: 1 }] },
  ])(
    'preserves empty and capped pages at offset $offset and total $total',
    async ({ requestedLimit, items, ...metadata }) => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ ...metadata, items })),
      )
      await expect(
        fetchApiPage('/v1/items', 'items', { limit: requestedLimit, offset: metadata.offset }),
      ).resolves.toEqual({
        ...metadata,
        rows: items,
      })
    },
  )

  it.each([
    { name: 'wrong key', body: { total: 0, limit: 100, offset: 0, augments: [] } },
    { name: 'bare array', body: [] },
    { name: 'null', body: null },
    { name: 'scalar', body: 'items' },
    { name: 'missing rows', body: { total: 0, limit: 100, offset: 0 } },
    { name: 'null rows', body: { total: 0, limit: 100, offset: 0, items: null } },
    { name: 'object rows', body: { total: 0, limit: 100, offset: 0, items: {} } },
    ...['total', 'limit', 'offset'].flatMap((field) => [
      {
        name: `missing ${field}`,
        body: { total: 0, limit: 100, offset: 0, items: [], [field]: undefined },
      },
      {
        name: `null ${field}`,
        body: { total: 0, limit: 100, offset: 0, items: [], [field]: null },
      },
      {
        name: `string ${field}`,
        body: { total: 0, limit: 100, offset: 0, items: [], [field]: '100' },
      },
      {
        name: `negative ${field}`,
        body: { total: 0, limit: 100, offset: 0, items: [], [field]: -1 },
      },
      {
        name: `fractional ${field}`,
        body: { total: 0, limit: 100, offset: 0, items: [], [field]: 0.5 },
      },
      {
        name: `unsafe ${field}`,
        body: { total: 0, limit: 100, offset: 0, items: [], [field]: Number.MAX_SAFE_INTEGER + 1 },
      },
    ]),
    { name: 'zero limit', body: { total: 0, limit: 0, offset: 0, items: [] } },
  ])('rejects $name with a tagged response error', async ({ name, body }) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(body)))
    const error = await fetchApiPage('/v1/items', 'items').catch((caught: unknown) => caught)
    expect(isApiError(error)).toBe(true)
    expect(error).toMatchObject({ name: 'ApiError', kind: 'api-response' })
    if (!isApiError(error)) throw new Error('Expected ApiError')
    expect(error.message).toContain('/v1/items')
    expect(error.message).toContain('items')
    const failedField = ['total', 'limit', 'offset'].find((field) => name.includes(field))
    if (failedField) expect(error.message).toContain(`: ${failedField}`)
    expect(apiErrorDescription(error).kind).toBe('our-bug')
  })
})

describe('fetchApiJson', () => {
  it('returns the parsed body on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: 1 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    await expect(fetchApiJson<{ total: number }>('/v1/items')).resolves.toEqual({ total: 1 })
  })

  it('throws a tagged error for a non-OK status with the body as detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"error":"not found"}', { status: 404, statusText: 'Not Found' }),
    )
    const err = await fetchApiJson('/v1/items/9').catch((e: unknown) => e)
    expect(isApiError(err)).toBe(true)
    if (!isApiError(err)) throw new Error('unreachable')
    expect(err.kind).toBe(API_HTTP_ERROR)
    expect(err.httpStatus).toBe(404)
    expect(err.message).toContain('not found')
    expect(apiErrorDescription(err, { missingResourceName: 'item' }).heading).toBe(
      'This item no longer exists.',
    )
  })

  it('caps a long HTTP response body and keeps its bug-report URL below 8000 characters', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('x'.repeat(10_000), { status: 502 }),
    )
    const error = await fetchApiJson('/v1/items/9').catch((caught: unknown) => caught)
    expect(isApiError(error)).toBe(true)
    if (!isApiError(error)) throw new Error('Expected ApiError')
    expect(error.message).toContain('x'.repeat(300) + '…')
    expect(error.message).not.toContain('x'.repeat(301))
    const { newIssueUrl } = githubIssueUrls(
      error,
      'bug',
      'Game data error: server on /v1/items/9',
      undefined,
      [
        `**API path:** /v1/items/9`,
        '**Site version:** 0.0.60',
        `**API base URL:** ${API_BASE_URL}`,
      ],
    )
    expect(newIssueUrl.length).toBeLessThan(8000)
    expect(new URL(newIssueUrl).searchParams.get('body')).toContain('**API base URL:**')
  })

  it('keeps a Unicode character intact at the HTTP body preview boundary', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('x'.repeat(299) + '😀' + 'x'.repeat(10_000), { status: 502 }),
    )
    const error = await fetchApiJson('/v1/items/9').catch((caught: unknown) => caught)
    expect(isApiError(error)).toBe(true)
    if (!isApiError(error)) throw new Error('Expected ApiError')
    expect(error.message).toContain('x'.repeat(299) + '😀…')
    expect(githubIssueUrls(error, 'bug').newIssueUrl.length).toBeLessThan(8000)
  })

  it('does not leave an extra space when an HTTP status has no text', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Bad request', { status: 400 }))
    await expect(fetchApiJson('/v1/items')).rejects.toMatchObject({
      message: '400 for /v1/items: Bad request',
    })
  })

  it('wraps a failed fetch as a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const err = await fetchApiJson('/v1/items').catch((e: unknown) => e)
    expect(isApiError(err) && err.kind).toBe(API_NETWORK_ERROR)
    expect(apiErrorDescription(err).hint).toContain('connection')
  })

  it('reports an aborted request as a timeout', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('aborted', 'AbortError'))
    const err = await fetchApiJson('/v1/items').catch((e: unknown) => e)
    expect(isApiError(err) && err.kind).toBe(API_TIMEOUT_ERROR)
  })

  it('describes unknown errors generically', () => {
    expect(apiErrorDescription(new Error('boom')).heading).toMatch(/went wrong/)
  })

  it('tags an unreadable JSON response with its path', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{invalid'))
    await expect(fetchApiJson('/v1/items/9')).rejects.toMatchObject({
      kind: API_RESPONSE_ERROR,
      message: expect.stringContaining('/v1/items/9: body'),
    })
  })
})

describe('apiErrorDescription', () => {
  it.each([
    {
      error: new ApiError(API_NETWORK_ERROR, 0, 'Failed to fetch'),
      expected: [
        'connection',
        'Could not reach the game-data service.',
        'Check your connection, then retry.',
        true,
        false,
      ],
    },
    {
      error: new ApiError(API_TIMEOUT_ERROR, 0, 'Timed out'),
      expected: [
        'slow',
        'The game-data service is taking too long.',
        'It may be waking up. Retry in a moment.',
        true,
        false,
      ],
    },
    {
      error: new ApiError(API_HTTP_ERROR, 429, '429'),
      expected: ['busy', 'Too many requests.', 'Wait a few seconds, then retry.', true, false],
    },
    {
      error: new ApiError(API_HTTP_ERROR, 500, '500'),
      expected: [
        'server',
        'The game-data service had a problem.',
        'Retry in a moment. If it keeps happening, report it.',
        true,
        true,
      ],
    },
    {
      error: new ApiError(API_HTTP_ERROR, 400, 'Unknown query parameter'),
      expected: [
        'our-bug',
        'Something went wrong on our side.',
        "This isn't something you can fix. Please report it so we can.",
        true,
        true,
      ],
    },
    {
      error: new ApiError(API_RESPONSE_ERROR, 0, 'Invalid response'),
      expected: [
        'our-bug',
        'Something went wrong on our side.',
        "This isn't something you can fix. Please report it so we can.",
        true,
        true,
      ],
    },
    {
      error: new TypeError('Cannot read properties of undefined'),
      expected: [
        'our-bug',
        'Something went wrong on our side.',
        "This isn't something you can fix. Please report it so we can.",
        true,
        true,
      ],
    },
    {
      error: 'unexpected throw',
      expected: [
        'our-bug',
        'Something went wrong on our side.',
        "This isn't something you can fix. Please report it so we can.",
        true,
        true,
      ],
    },
  ])('classifies $error', ({ error, expected }) => {
    const description = apiErrorDescription(error)
    expect([
      description.kind,
      description.heading,
      description.hint,
      description.canRetry,
      description.canReport,
    ]).toEqual(expected)
  })

  it('treats a missing single item differently from a missing list endpoint', () => {
    const error = new ApiError(API_HTTP_ERROR, 404, '404 /v1/items/9')
    expect(apiErrorDescription(error, { missingResourceName: 'item' })).toEqual({
      kind: 'not-found',
      heading: 'This item no longer exists.',
      hint: 'Pick another row from the list.',
      canRetry: false,
      canReport: false,
    })
    expect(apiErrorDescription(error).kind).toBe('our-bug')
  })
})
