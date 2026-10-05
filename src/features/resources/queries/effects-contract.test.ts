import { afterEach, expect, it, vi } from 'vitest'
import type { ApiAugmentDetail, ApiItemDetail, ApiSetDetail } from '../../../lib/api'
import {
  isApiEffect,
  isApiEffectDetail,
  isApiEffectVocabularyRow,
  multiValueFilterParameters,
  statBonusFilterValue,
} from '../../../lib/api'
import itemResponse from './fixtures/effects-item.json'
import augmentResponse from './fixtures/effects-augment.json'
import setResponse from './fixtures/effects-set.json'
import effectPage from './fixtures/effects-page.json'
import effectDetail from './fixtures/effects-detail.json'
import groupPage from './fixtures/effects-page-groups.json'
import groupDetail from './fixtures/effect-detail-336.json'
import groupItem from './fixtures/effects-item-457.json'
import {
  fetchAugment,
  fetchEffectDetail,
  fetchEffectVocabulary,
  fetchItem,
  toAugmentDetail,
  toItem,
} from './items'
import { fetchSet, toSetDetail } from './sets'

afterEach(() => vi.unstubAllGlobals())

it('maps captured owner effects with their provenance and damage', () => {
  const item = toItem(itemResponse as ApiItemDetail)
  const augment = toAugmentDetail(augmentResponse as ApiAugmentDetail)
  const set = toSetDetail(setResponse as ApiSetDetail)
  expect(item.effects[0]).toMatchObject({
    id: 6,
    name: 'Charisma',
    verboseName: 'Enhancement Charisma 8',
    tier: null,
    damage: [],
    bonuses: [{ statName: 'Charisma', value: 8, amountSource: 'owner', scale: 1 }],
  })
  expect(new Set(item.adventurePackDrops.map((pack) => pack.key)).size).toBe(
    item.adventurePackDrops.length,
  )
  expect(augment.effects[0].verboseName).toBe('Artifact Physical Resistance Rating +10')
  expect(set.tiers[0].effects[0].bonuses[0]).toMatchObject({
    statName: 'Positive Spell Power',
    value: 36,
    amountSource: 'owner',
    scale: 1,
  })
})

it('guards required provenance, damage, tiers and unified vocabulary paths', () => {
  const effect = itemResponse.effects[0]
  expect(isApiEffect(effect)).toBe(true)
  expect(
    isApiEffect({
      effect_id: 4,
      name: 'Text only',
      verbose_name: 'Text only',
      bonuses: [],
      damage: [],
    }),
  ).toBe(true)
  expect(isApiEffect({ ...effect, verbose_name: undefined })).toBe(false)
  expect(isApiEffect({ ...effect, damage: undefined })).toBe(false)
  expect(
    isApiEffect({ ...effect, bonuses: [{ ...effect.bonuses[0], amount_source: undefined }] }),
  ).toBe(false)
  expect(isApiEffect({ ...effect, bonuses: [{ ...effect.bonuses[0], scale: undefined }] })).toBe(
    false,
  )
  expect(isApiEffect({ ...effect, tier: { group: 'Riposte', rank: 2 } })).toBe(true)
  expect(isApiEffectVocabularyRow(effectPage.effects[0])).toBe(true)
  expect(isApiEffectVocabularyRow(effectPage.effects[1])).toBe(true)
  expect(isApiEffectVocabularyRow({ ...effectPage.effects[0], detail_path: '/v1/stats/87' })).toBe(
    false,
  )
})

it('guards both effect kinds and partial nested detail responses', () => {
  expect(isApiEffectDetail(effectDetail)).toBe(true)
  expect(effectDetail.verbose_name_template).toBe('%b1 Strength +{1}')
  expect(isApiEffectDetail({ ...effectDetail, verbose_name_template: undefined })).toBe(false)
  expect(isApiEffectDetail({ ...effectDetail, kind: 'effect' })).toBe(true)
  expect(isApiEffectDetail({ ...effectDetail, kind: 'unknown' })).toBe(false)
  expect(isApiEffectDetail({ ...effectDetail, damage: undefined })).toBe(false)
  expect(
    isApiEffectDetail({ ...effectDetail, items: { ...effectDetail.items, offset: undefined } }),
  ).toBe(false)
  expect(isApiEffectDetail({ ...effectDetail, tier: { group: 'Riposte', rank: 2 } })).toBe(false)
  expect(
    isApiEffectDetail({ ...effectDetail, set_tiers: { ...effectDetail.set_tiers, limit: null } }),
  ).toBe(false)
  expect(
    isApiEffectDetail({
      ...effectDetail,
      items: {
        ...effectDetail.items,
        items: [{ ...effectDetail.items.items[0], line: undefined }],
      },
    }),
  ).toBe(false)
  expect(
    isApiEffectDetail({
      ...effectDetail,
      augments: {
        ...effectDetail.augments,
        augments: [{ ...effectDetail.augments.augments[0], line: undefined }],
      },
    }),
  ).toBe(false)
  expect(
    isApiEffectDetail({
      ...effectDetail,
      set_tiers: {
        ...effectDetail.set_tiers,
        set_tiers: [{ ...effectDetail.set_tiers.set_tiers[0], line: undefined }],
      },
    }),
  ).toBe(false)
})

it('accepts captured group bonuses, group vocabulary and per-link carriers', () => {
  const groupEffect = groupItem.effects.find((effect) => effect.name === 'Command')
  expect(isApiEffect(groupEffect)).toBe(true)
  expect(groupEffect?.bonuses[0].group).toEqual({ id: 336, name: 'Charisma Skills' })
  expect(
    isApiEffect({
      ...groupEffect,
      bonuses: [{ ...groupEffect?.bonuses[0], group: { id: 'bad', name: 'Charisma Skills' } }],
    }),
  ).toBe(false)
  expect(isApiEffectVocabularyRow(groupPage.effects[0])).toBe(true)
  expect(isApiEffectDetail(groupDetail)).toBe(true)
  expect(groupDetail.kind).toBe('group')
  expect(groupDetail.items.items[0].bonuses).toHaveLength(6)
  expect(groupDetail.items.items[0].bonuses?.[0].group?.name).toBe('Charisma Skills')
  expect(groupDetail.items.items[0].line.verbose_name).toBe('Insightful Command +5')
  expect(isApiEffect(groupDetail.items.items[0].line)).toBe(true)
  expect(
    groupDetail.items.items[0].bonuses?.every(
      (bonus) =>
        bonus.value === groupDetail.items.items[0].value &&
        bonus.bonus_type === groupDetail.items.items[0].bonus_type,
    ),
  ).toBe(true)
  expect(groupDetail.bonuses[0]).toMatchObject({ target: 'Bluff', target_kind: 'stat' })
  expect(
    isApiEffectDetail({
      ...groupDetail,
      items: {
        ...groupDetail.items,
        items: [{ ...groupDetail.items.items[0], bonuses: [{ stat: 'Bluff' }] }],
      },
    }),
  ).toBe(false)
})

it.each([
  {
    name: 'item detail',
    fetchCurrent: () => fetchItem(itemResponse.id),
    stale: { ...itemResponse, effects: undefined },
    current: itemResponse,
  },
  {
    name: 'augment detail',
    fetchCurrent: () => fetchAugment(augmentResponse.id),
    stale: { ...augmentResponse, effects: undefined },
    current: augmentResponse,
  },
  {
    name: 'set detail',
    fetchCurrent: () => fetchSet(setResponse.id),
    stale: { ...setResponse, tiers: [{ ...setResponse.tiers[0], effects: undefined }] },
    current: setResponse,
  },
  {
    name: 'effect vocabulary',
    fetchCurrent: () => fetchEffectVocabulary(),
    stale: {
      ...effectPage,
      effects: [{ ...effectPage.effects[0], kind: 'unknown' }],
    },
    current: effectPage,
  },
  {
    name: 'effect detail',
    fetchCurrent: () => fetchEffectDetail('/v1/effects/1'),
    stale: { ...effectDetail, verbose_name_template: undefined },
    current: effectDetail,
  },
])(
  'reloads a stale $name response once at its original URL',
  async ({ fetchCurrent, stale, current }) => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(stale)))
      .mockResolvedValueOnce(new Response(JSON.stringify(current)))
    vi.stubGlobal('fetch', fetchMock)
    await expect(fetchCurrent()).resolves.toBeDefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0][0]).toBe(fetchMock.mock.calls[1][0])
    expect(fetchMock.mock.calls[1][1]).toHaveProperty('cache', 'reload')
  },
)

it('does not reload a current item response and stops after two stale ones', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(itemResponse)))
  vi.stubGlobal('fetch', fetchMock)
  await expect(fetchItem(itemResponse.id)).resolves.toBeDefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fetchMock
    .mockClear()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ...itemResponse, effects: undefined }))),
    )
  await expect(fetchItem(itemResponse.id)).rejects.toMatchObject({ kind: 'api-response' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1]).toHaveProperty('cache', 'reload')
})

it('fetches both kinds through /v1/effects and rejects malformed owner effects', async () => {
  const responses: Record<string, unknown> = {
    '/v1/effects': effectPage,
    '/v1/effects/1': effectDetail,
    '/v1/effects/2': { ...effectDetail, id: 2, kind: 'effect', name: 'Riposte' },
    '/v1/effects/336': groupDetail,
    [`/v1/items/${itemResponse.id}`]: itemResponse,
    [`/v1/augments/${augmentResponse.id}`]: augmentResponse,
    [`/v1/sets/${setResponse.id}`]: setResponse,
  }
  const fetchMock = vi.fn((request: string) =>
    Promise.resolve(new Response(JSON.stringify(responses[new URL(request).pathname]))),
  )
  vi.stubGlobal('fetch', fetchMock)
  expect((await fetchItem(itemResponse.id)).effects[0].verboseName).toBe(
    itemResponse.effects[0].verbose_name,
  )
  expect((await fetchAugment(augmentResponse.id)).effects[0].verboseName).toBe(
    augmentResponse.effects[0].verbose_name,
  )
  expect((await fetchSet(setResponse.id)).tiers[0].effects).toHaveLength(1)
  expect((await fetchEffectVocabulary('acid')).rows.map((row) => row.kind)).toEqual([
    'stat',
    'stat',
    'stat',
  ])
  expect((await fetchEffectDetail('/v1/effects/1')).kind).toBe('stat')
  expect((await fetchEffectDetail('/v1/effects/2')).kind).toBe('effect')
  expect((await fetchEffectDetail('/v1/effects/336')).kind).toBe('group')
  for (const [request] of fetchMock.mock.calls.filter(([request]) =>
    /\/v1\/effects\/\d+$/.test(new URL(String(request)).pathname),
  )) {
    const parameters = new URL(String(request)).searchParams
    expect(Object.fromEntries(parameters)).toEqual({
      items_limit: '0',
      augments_limit: '0',
      set_tiers_limit: '0',
    })
  }
  await expect(fetchEffectDetail('/v1/stats/1')).rejects.toMatchObject({ kind: 'api-response' })
  expect(new URL(String(fetchMock.mock.calls[3][0])).searchParams.get('q')).toBe('acid')
  responses[`/v1/items/${itemResponse.id}`] = {
    ...itemResponse,
    effects: [{ ...itemResponse.effects[0], bonuses: undefined }],
  }
  await expect(fetchItem(itemResponse.id)).rejects.toMatchObject({ kind: 'api-response' })
  responses[`/v1/items/${itemResponse.id}`] = null
  await expect(fetchItem(itemResponse.id)).rejects.toMatchObject({ kind: 'api-response' })
  responses[`/v1/augments/${augmentResponse.id}`] = null
  await expect(fetchAugment(augmentResponse.id)).rejects.toMatchObject({ kind: 'api-response' })
  responses[`/v1/sets/${setResponse.id}`] = { ...setResponse, tiers: undefined }
  await expect(fetchSet(setResponse.id)).rejects.toMatchObject({ kind: 'api-response' })
})

it('builds repeated bonus keys and type selection without a match flag in Any mode', () => {
  expect(statBonusFilterValue('Constitution', 'Insightful')).toBe('Constitution:Insightful')
  expect(
    multiValueFilterParameters('bonus', ['Strength', 'Constitution:Insightful'], 'all'),
  ).toEqual({
    bonus: ['Strength', 'Constitution:Insightful'],
    bonus_match: 'all',
  })
  expect(multiValueFilterParameters('bonus', ['Strength'])).toEqual({
    bonus: ['Strength'],
    bonus_match: undefined,
  })
  expect(multiValueFilterParameters('bonus', [], 'all')).toEqual({})
  expect(multiValueFilterParameters('slot', ['Back', 'Ring'])).toEqual({
    slot: ['Back', 'Ring'],
    slot_match: undefined,
  })
  expect(multiValueFilterParameters('quest', ['7', '8'])).toEqual({
    quest: ['7', '8'],
    quest_match: undefined,
  })
})
