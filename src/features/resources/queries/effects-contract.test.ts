import { afterEach, expect, it, vi } from 'vitest'
import { slugFromPathSegment } from '../../../lib/api'
import { apiFixture } from '../../../test/apiFixture'
import type {
  ApiAugmentDetail,
  ApiEffect,
  ApiItemDetail,
  ApiNote,
  ApiSetDetail,
} from '../../../lib/api'
import {
  isApiEffect,
  isApiEffectDetail,
  isApiEffectVocabularyRow,
  multiValueFilterParameters,
  statBonusFilterValue,
} from '../../../lib/api'
import itemResponseResponse from './fixtures/item-stolen-necklace-level-25.json'
import augmentResponseResponse from './fixtures/augment-solar-gem-of-physical-resistance-rating-heroic.json'
import setResponseResponse from './fixtures/set-devoted-heart.json'
import effectPageResponse from './fixtures/effects-page.json'
import effectDetailResponse from './fixtures/effect-strength.json'
import groupPageResponse from './fixtures/effects-page-groups.json'
import groupDetailResponse from './fixtures/effect-charisma-skills.json'
import groupItemResponse from './fixtures/item-absolute-judgement.json'
import resistanceResponse from './fixtures/effect-elemental-resistance.json'
import rampartResponse from './fixtures/item-epic-deaths-rampart.json'
import plagueWolfResponse from './fixtures/feat-wild-shape-plague-wolf.json'
import {
  fetchAugment,
  fetchEffectDetail,
  fetchEffectVocabulary,
  fetchItem,
  toAugmentDetail,
  toEffect,
  toItem,
} from './items'
import { fetchSet, toSetDetail } from './sets'

const itemResponse = apiFixture(itemResponseResponse)
const augmentResponse = apiFixture(augmentResponseResponse)
const setResponse = apiFixture(setResponseResponse)
const effectPage = apiFixture(effectPageResponse)
const effectDetail = apiFixture(effectDetailResponse)
const groupPage = apiFixture(groupPageResponse)
const groupDetail = apiFixture(groupDetailResponse)
const groupItem = apiFixture(groupItemResponse)

afterEach(() => vi.unstubAllGlobals())

it('maps captured owner effects with their provenance and damage', () => {
  const item = toItem(itemResponse as ApiItemDetail)
  const augment = toAugmentDetail(augmentResponse as ApiAugmentDetail)
  const set = toSetDetail(setResponse as ApiSetDetail)
  expect(item.effects[0]).toMatchObject({
    slug: itemResponse.effects[0].effect_slug,
    name: 'Charisma',
    verboseName: 'Charisma +8',
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
      effect_slug: slugFromPathSegment('test-4')!,
      name: 'Text only',
      verbose_name: 'Text only',
      notes: [],
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
  expect(isApiEffectVocabularyRow({ ...effectPage.effects[0], slug: '/v1/stats/test-87' })).toBe(
    false,
  )
})

it('guards the declared note fields on effects and every carrier line', () => {
  const note = plagueWolfResponse.notes[0]
  const invalidFields = {
    kind: 'unknown',
    field: 4,
    qualifier: false,
    text: null,
    intended: undefined,
    assumed: { nested: [undefined] },
    in_game: 'yes',
    recorded: null,
  } satisfies Record<keyof ApiNote, unknown>
  const invalidNotes = [
    undefined,
    null,
    {},
    [null],
    ...Object.entries(invalidFields).map(([field, value]) => [{ ...note, [field]: value }]),
  ]
  const line = itemResponse.effects[0]
  expect(isApiEffect({ ...line, notes: [note] })).toBe(true)
  expect(isApiEffectDetail({ ...effectDetail, notes: [note] })).toBe(true)
  for (const notes of invalidNotes) {
    expect(isApiEffect({ ...line, notes })).toBe(false)
    expect(isApiEffectDetail({ ...effectDetail, notes })).toBe(false)
    for (const key of ['items', 'augments', 'set_tiers'] as const) {
      const page = effectDetail[key]
      const carriers =
        key === 'items'
          ? effectDetail.items.items
          : key === 'augments'
            ? effectDetail.augments.augments
            : effectDetail.set_tiers.set_tiers
      expect(carriers.length).toBeGreaterThan(0)
      expect(
        isApiEffectDetail({
          ...effectDetail,
          [key]: {
            ...page,
            [key]: carriers.map((carrier) => ({
              ...carrier,
              line: { ...carrier.line, notes },
            })),
          },
        }),
      ).toBe(false)
      expect(
        isApiEffectDetail({
          ...effectDetail,
          [key]: {
            ...page,
            [key]: carriers.map((carrier) => ({
              ...carrier,
              lines: [{ line: { ...carrier.line, notes } }],
            })),
          },
        }),
      ).toBe(false)
    }
  }
})

it('guards nullable alias matches without accepting missing or malformed values', () => {
  for (const matched_alias of [undefined, 0, false, {}, []])
    expect(isApiEffectVocabularyRow({ ...effectPage.effects[0], matched_alias })).toBe(false)
  for (const matched_alias of [null, '', 'Spellsight'])
    expect(isApiEffectVocabularyRow({ ...effectPage.effects[0], matched_alias })).toBe(true)
})

it('preserves the captured Rampart note on its nested effect carrier line', () => {
  const detail = apiFixture(resistanceResponse)
  expect(isApiEffectDetail(detail)).toBe(true)
  const carrier = detail.items.items.find((item) => item.slug === rampartResponse.slug)!
  expect(carrier).toBeDefined()
  const line = carrier.lines.find(({ line }) => line.notes.length > 0)!.line
  const item = toItem(apiFixture(rampartResponse) as ApiItemDetail)
  expect(toEffect(line as ApiEffect, 0).notes).toEqual(
    item.effects.find((effect) => effect.slug === detail.slug && effect.notes.length > 0)!.notes,
  )
  expect(
    isApiEffectDetail({
      ...detail,
      items: {
        ...detail.items,
        items: [
          {
            ...carrier,
            lines: [{ line: { ...line, notes: undefined } }],
          },
        ],
      },
    }),
  ).toBe(false)
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
  expect(groupEffect?.bonuses[0].group).toMatchObject({
    slug: groupDetail.slug,

    name: 'Charisma Skills',
  })
  expect(
    isApiEffect({
      ...groupEffect,
      bonuses: [
        { ...groupEffect?.bonuses[0], group: { slug: 'Bad Slug', name: 'Charisma Skills' } },
      ],
    }),
  ).toBe(false)
  expect(isApiEffectVocabularyRow(groupPage.effects[0])).toBe(true)
  expect(isApiEffectDetail(groupDetail)).toBe(true)
  expect(groupDetail.kind).toBe('group')
  expect(groupDetail.items.items[0].bonuses).toHaveLength(6)
  expect(groupDetail.items.items[0].bonuses?.[0].group?.name).toBe('Charisma Skills')
  expect(toEffect(groupDetail.items.items[0].line as ApiEffect, 0).verboseName).toBe(
    groupDetail.items.items[0].line.verbose_name,
  )
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
    fetchCurrent: () => fetchItem(itemResponse.slug),
    stale: { ...itemResponse, effects: undefined },
    current: itemResponse,
  },
  {
    name: 'augment detail',
    fetchCurrent: () => fetchAugment(augmentResponse.slug),
    stale: { ...augmentResponse, effects: undefined },
    current: augmentResponse,
  },
  {
    name: 'set detail',
    fetchCurrent: () => fetchSet(setResponse.slug),
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
    fetchCurrent: () => fetchEffectDetail(slugFromPathSegment('test-1')!),
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
  await expect(fetchItem(itemResponse.slug)).resolves.toBeDefined()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fetchMock
    .mockClear()
    .mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ...itemResponse, effects: undefined }))),
    )
  await expect(fetchItem(itemResponse.slug)).rejects.toMatchObject({ kind: 'api-response' })
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[1][1]).toHaveProperty('cache', 'reload')
})

it('fetches both kinds through /v1/effects and rejects malformed owner effects', async () => {
  const responses: Record<string, unknown> = {
    '/v1/effects': effectPage,
    '/v1/effects/test-1': effectDetail,
    '/v1/effects/test-2': {
      ...effectDetail,
      slug: slugFromPathSegment('test-2')!,
      kind: 'effect',
      name: 'Riposte',
    },
    '/v1/effects/test-338': groupDetail,
    [`/v1/items/${itemResponse.slug}`]: itemResponse,
    [`/v1/augments/${augmentResponse.slug}`]: augmentResponse,
    [`/v1/sets/${setResponse.slug}`]: setResponse,
  }
  const fetchMock = vi.fn((request: string) =>
    Promise.resolve(new Response(JSON.stringify(responses[new URL(request).pathname]))),
  )
  vi.stubGlobal('fetch', fetchMock)
  expect((await fetchItem(itemResponse.slug)).effects[0].verboseName).toBe(
    itemResponse.effects[0].verbose_name,
  )
  expect((await fetchAugment(augmentResponse.slug)).effects[0].verboseName).toBe(
    augmentResponse.effects[0].verbose_name,
  )
  expect((await fetchSet(setResponse.slug)).tiers[0].effects).toHaveLength(1)
  expect((await fetchEffectVocabulary('acid')).rows.map((row) => row.kind)).toEqual([
    'stat',
    'stat',
    'stat',
  ])
  expect((await fetchEffectDetail(slugFromPathSegment('test-1')!)).kind).toBe('stat')
  expect((await fetchEffectDetail(slugFromPathSegment('test-2')!)).kind).toBe('effect')
  expect((await fetchEffectDetail(slugFromPathSegment('test-338')!)).kind).toBe('group')
  for (const [request] of fetchMock.mock.calls.filter(([request]) =>
    /\/v1\/effects\/[^/]+$/.test(new URL(String(request)).pathname),
  )) {
    const parameters = new URL(String(request)).searchParams
    expect(Object.fromEntries(parameters)).toEqual({
      items_limit: '0',
      augments_limit: '0',
      set_tiers_limit: '0',
    })
  }
  expect(new URL(String(fetchMock.mock.calls[3][0])).searchParams.get('q')).toBe('acid')
  responses[`/v1/items/${itemResponse.slug}`] = {
    ...itemResponse,
    effects: [{ ...itemResponse.effects[0], bonuses: undefined }],
  }
  await expect(fetchItem(itemResponse.slug)).rejects.toMatchObject({ kind: 'api-response' })
  responses[`/v1/items/${itemResponse.slug}`] = null
  await expect(fetchItem(itemResponse.slug)).rejects.toMatchObject({ kind: 'api-response' })
  responses[`/v1/augments/${augmentResponse.slug}`] = null
  await expect(fetchAugment(augmentResponse.slug)).rejects.toMatchObject({ kind: 'api-response' })
  responses[`/v1/sets/${setResponse.slug}`] = { ...setResponse, tiers: undefined }
  await expect(fetchSet(setResponse.slug)).rejects.toMatchObject({ kind: 'api-response' })
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

it('accepts set tier carriers without a nested row identity', () => {
  const detail = structuredClone(effectDetail)
  expect(detail.set_tiers.set_tiers.length).toBeGreaterThan(0)
  for (const tier of detail.set_tiers.set_tiers) Reflect.deleteProperty(tier, 'slug')
  expect(isApiEffectDetail(detail)).toBe(true)
})
