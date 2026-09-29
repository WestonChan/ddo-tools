import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  API_BASE_URL,
  fetchApiJson,
  apiUrl,
  API_HTTP_ERROR,
  API_NETWORK_ERROR,
  API_TIMEOUT_ERROR,
  apiErrorDescription,
  isApiError,
} from './client'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('apiUrl', () => {
  it('drops empty, undefined and false query values and encodes the rest', () => {
    expect(apiUrl('/v1/items', { q: 'a b', limit: 10, raid: false, pack: '', slot: undefined })).toBe(
      `${API_BASE_URL}/v1/items?q=a+b&limit=10`,
    )
    expect(apiUrl('/v1/items', { raid: true })).toBe(`${API_BASE_URL}/v1/items?raid=true`)
    expect(apiUrl('/v1/version')).toBe(`${API_BASE_URL}/v1/version`)
  })

  it('always has an origin, so an unset VITE_API_URL still reaches the public API', () => {
    expect(API_BASE_URL).toMatch(/^https?:\/\//)
    expect(API_BASE_URL.endsWith('/')).toBe(false)
  })
})

describe('fetchApiJson', () => {
  it('returns the parsed body on success', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ total: 1 }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )
    await expect(fetchApiJson<{ total: number }>('/v1/items')).resolves.toEqual({ total: 1 })
  })

  it('throws a tagged error for a non-OK status with the body as detail', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"error":"not found"}', { status: 404, statusText: 'Not Found' }))
    const err = await fetchApiJson('/v1/items/9').catch((e: unknown) => e)
    expect(isApiError(err)).toBe(true)
    if (!isApiError(err)) throw new Error('unreachable')
    expect(err.kind).toBe(API_HTTP_ERROR)
    expect(err.httpStatus).toBe(404)
    expect(err.message).toContain('not found')
    expect(apiErrorDescription(err).heading).toBe('Not found')
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
})
