import { apiFixture } from '../../../test/apiFixture'
import { afterEach, expect, it, vi } from 'vitest'
import { slugFromPathSegment } from '../../../lib/api'
import capturedItemResponse from './fixtures/item-adversion.json'
import capturedAugmentResponse from './fixtures/augment-solar-gem-of-physical-resistance-rating-heroic.json'
import capturedSetResponse from './fixtures/set-devoted-heart.json'
import capturedEffectResponse from './fixtures/effect-strength.json'
import capturedPackResponse from './fixtures/adventure-pack-magic-of-myth-drannor.json'
import {
  fetchItem,
  fetchAugment,
  fetchEffectDetail,
  itemListParameters,
  EMPTY_ITEM_FILTERS,
} from './items'
import { fetchSet } from './sets'
import { fetchAdventurePack } from './sources'

const capturedItem = apiFixture(capturedItemResponse)
const capturedAugment = apiFixture(capturedAugmentResponse)
const capturedSet = apiFixture(capturedSetResponse)
const capturedEffect = apiFixture(capturedEffectResponse)
const capturedPack = apiFixture(capturedPackResponse)

afterEach(() => vi.restoreAllMocks())

function withoutNumericIdentity(response: unknown): unknown {
  if (Array.isArray(response)) return response.map(withoutNumericIdentity)
  if (response !== null && typeof response === 'object')
    return Object.fromEntries(
      Object.entries(response)
        .filter(([key]) => key !== 'id' && !key.endsWith('_id') && key !== 'detail_path')
        .map(([key, value]) => [key, withoutNumericIdentity(value)]),
    )
  return response
}

it.each([
  ['items', fetchItem, capturedItem],
  ['augments', fetchAugment, capturedAugment],
  ['sets', fetchSet, capturedSet],
  ['effects', fetchEffectDetail, capturedEffect],
  ['adventure-packs', fetchAdventurePack, capturedPack],
] as const)(
  'addresses %s by slug with and without numeric fields',
  async (kind, fetchDetail, capture) => {
    const slug = slugFromPathSegment(capture.slug)!
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    for (const response of [capture, withoutNumericIdentity(capture)]) {
      fetchMock.mockImplementation(async () => new Response(JSON.stringify(response)))
      const detail = await fetchDetail(slug)
      expect(detail).toHaveProperty('slug', slug)
      expect(new URL(String(fetchMock.mock.calls.at(-1)![0])).pathname).toBe(`/v1/${kind}/${slug}`)
    }
  },
)

it('sends raid slugs through the quest filter', () => {
  const raid = slugFromPathSegment('the-vault-of-night')!
  expect(itemListParameters({ ...EMPTY_ITEM_FILTERS, raid: [raid] }, '', false).quest).toEqual([
    raid,
  ])
})
