import { expect, expectTypeOf, it } from 'vitest'
import {
  API_DETAIL_KINDS,
  apiDetailPath,
  apiResponseDiagnosticPath,
  slugFromPathSegment,
} from './entityPaths'
import type { Slug } from './types'

it('requires a slug for request detail paths', () => {
  expectTypeOf(apiDetailPath).parameter(1).toEqualTypeOf<Slug>()
})

it.each([null, undefined])('keeps the missing-slug diagnostic path for %s', (slug) => {
  expect(apiResponseDiagnosticPath('items', slug)).toBe('/v1/items/unknown')
})

it.each(['strength', '1-strength', 'sapphire--resistance', '6263613332164767'])(
  'accepts %s',
  (segment) => expect(slugFromPathSegment(segment)).toBe(segment),
)

it.each([
  '',
  'Strength',
  'two words',
  '../item',
  'item/other',
  '-item',
  'item\n',
  'item\r',
  'item\u2028',
  'item\u2029',
])('rejects %j', (segment) => expect(slugFromPathSegment(segment)).toBeNull())

it('builds every detail kind from a validated segment', () => {
  const slug = slugFromPathSegment('strength')!
  for (const kind of API_DETAIL_KINDS)
    expect(apiDetailPath(kind, slug)).toBe(`/v1/${kind}/strength`)
  expect(API_DETAIL_KINDS).toHaveLength(16)
  for (const kind of API_DETAIL_KINDS)
    expect(apiResponseDiagnosticPath(kind, slug)).toBe(apiDetailPath(kind, slug))
})
