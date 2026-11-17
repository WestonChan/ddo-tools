import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, API_HTTP_ERROR, API_NETWORK_ERROR, fetchApiJson } from './client'
import { rejectedFilterValue } from './index'
import rejectedPack from './fixtures/rejected-pack-value.json'
import rejectedBonus from './fixtures/rejected-bonus-value.json'
import rejectedBonusType from './fixtures/rejected-bonus-type.json'
import rejectedSort from './fixtures/rejected-sort.json'
import rejectedView from './fixtures/rejected-view.json'

afterEach(() => vi.restoreAllMocks())

async function responseError(body: string, status = 400): Promise<unknown> {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(body, { status }))
  return fetchApiJson('/v1/items').catch((error: unknown) => error)
}

describe('rejectedFilterValue', () => {
  it.each([
    ['pack', rejectedPack, { parameter: 'pack', value: '  a"b\\c; accepted values: x  '.trim() }],
    ['bonus', rejectedBonus, { parameter: 'bonus', value: 'Made-Up' }],
    ['bonus type', rejectedBonusType, null],
    ['sort', rejectedSort, null],
    ['view', rejectedView, { parameter: 'view', value: 'bogus' }],
  ])('reads the captured %s response', async (_name, body, expected) => {
    expect(rejectedFilterValue(await responseError(JSON.stringify(body)))).toEqual(expected)
  })

  it.each(['v2', 'filter_2', 'v2_filter'])(
    'accepts letters, digits and underscores in parameter %s',
    async (parameter) => {
      const error = await responseError(JSON.stringify({ error: `unknown ${parameter} "x"` }))
      expect(rejectedFilterValue(error)).toEqual({ parameter, value: 'x' })
    },
  )

  it.each([
    [String.raw`a\nb\tc\rd\0e\u{200b}\u{10ffff}`, 'a\nb\tc\rd\0e\u200b\u{10ffff}'],
    ['', ''],
    ['Made-Up', 'Made-Up'],
    ['x'.repeat(400), 'x'.repeat(400)],
  ])('decodes the full quoted value %j', async (quoted, decoded) => {
    const error = await responseError(JSON.stringify({ error: `unknown socket "${quoted}"` }))
    expect(rejectedFilterValue(error)).toEqual({ parameter: 'socket', value: decoded })
  })

  it.each([
    String.raw`unknown pack "a\qb"`,
    String.raw`unknown pack "\u{110000}"`,
    String.raw`unknown pack "\u{d800}"`,
    String.raw`unknown pack "\u{}"`,
    String.raw`unknown pack "unterminated`,
    String.raw`unknown pack "value" unexpected suffix`,
    String.raw`unknown pack "value"; accepted values:`,
    'unknown pack "raw\nnewline"',
    'invalid pack_match "bogus"; expected any or all',
    'unknown PACK "x"',
    'unknown pack2Name "x"',
    'unknown _pack "x"',
    'unknown 2pack "x"',
    'unknown bonus type "x"',
    'unknown query parameter "x"; allowed parameters: view, sort',
    'prefix unknown pack "x"',
  ])('ignores a different or malformed message %j', async (responseErrorText) => {
    expect(
      rejectedFilterValue(await responseError(JSON.stringify({ error: responseErrorText }))),
    ).toBeNull()
  })

  it('ignores a 500, a non-JSON body and errors without API error text', async () => {
    expect(rejectedFilterValue(await responseError(JSON.stringify(rejectedPack), 500))).toBeNull()
    expect(rejectedFilterValue(await responseError('Bad request'))).toBeNull()
    expect(rejectedFilterValue(new ApiError(API_HTTP_ERROR, 400, rejectedPack.error))).toBeNull()
    expect(rejectedFilterValue(new ApiError(API_NETWORK_ERROR, 0, rejectedPack.error))).toBeNull()
    expect(rejectedFilterValue(null)).toBeNull()
  })
})
