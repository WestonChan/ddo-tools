import { afterEach, expect, it, vi } from 'vitest'
import type {
  ApiAugmentDetail,
  ApiEffect,
  ApiItemDetail,
  ApiNote,
  ApiSetDetail,
} from '../../../lib/api'
import { apiFixture } from '../../../test/apiFixture'
import plagueWolfResponse from './fixtures/feat-wild-shape-plague-wolf.json'
import rampartResponse from './fixtures/item-epic-deaths-rampart.json'
import smallbladeResponse from './fixtures/item-cutthroats-smallblade-level-8.json'
import augmentResponse from './fixtures/augment-solar-gem-of-physical-resistance-rating-heroic.json'
import setResponse from './fixtures/set-devoted-heart.json'
import mightyResponse from './fixtures/effects-page-mighty.json'
import strengthResponse from './fixtures/effects-page-strength.json'
import spellsightResponse from './fixtures/effects-page-spellsight.json'
import { fetchEffectVocabulary, toAugmentDetail, toEffect, toItem } from './items'
import { toSetDetail } from './sets'
import type { Note } from './notes'

afterEach(() => vi.restoreAllMocks())

function mappedNote(note: ApiNote): Note {
  const { in_game: isInGame, ...fields } = note
  return { ...fields, isInGame }
}

it('preserves every captured line note and entity note through the owner mappers', () => {
  const rampart = apiFixture(rampartResponse) as ApiItemDetail
  const smallblade = apiFixture(smallbladeResponse) as ApiItemDetail
  const augment = apiFixture(augmentResponse) as ApiAugmentDetail
  const set = apiFixture(setResponse) as ApiSetDetail
  const plagueWolf = apiFixture(plagueWolfResponse)
  for (const captured of [rampart, smallblade]) {
    const item = toItem(captured)
    expect(item.notes).toEqual(captured.notes.map(mappedNote))
    expect(item.effects.map((effect) => effect.notes)).toEqual(
      captured.effects.map((effect) => effect.notes.map(mappedNote)),
    )
  }
  expect(plagueWolf.bonuses.some((line) => line.notes.length > 0)).toBe(true)
  const capturedBugNotes = plagueWolf.bonuses.flatMap((line) => line.notes)
  const effectWithBugNotes = { ...rampart.effects[0], notes: capturedBugNotes } as ApiEffect
  expect(toEffect(effectWithBugNotes, 0).notes).toEqual(
    capturedBugNotes.map((note) => mappedNote(note as ApiNote)),
  )
  expect(toItem({ ...smallblade, notes: plagueWolf.notes } as ApiItemDetail).notes).toEqual(
    plagueWolf.notes.map((note) => mappedNote(note as ApiNote)),
  )
  expect(toAugmentDetail(augment).notes).toEqual(augment.notes.map(mappedNote))
  expect(toAugmentDetail(augment).effects.map((effect) => effect.notes)).toEqual(
    augment.effects.map((effect) => effect.notes.map(mappedNote)),
  )
  expect(toSetDetail(set).notes).toEqual(set.notes.map(mappedNote))
  expect(
    toSetDetail(set).tiers.flatMap((tier) => tier.effects.map((effect) => effect.notes)),
  ).toEqual(set.tiers.flatMap((tier) => tier.effects.map((effect) => effect.notes.map(mappedNote))))
})

it('rejects missing note collections on each owner and effect line', () => {
  expect(() => toItem({ ...apiFixture(rampartResponse), notes: undefined } as never)).toThrow(
    'notes',
  )
  expect(() =>
    toAugmentDetail({ ...apiFixture(augmentResponse), notes: undefined } as never),
  ).toThrow('notes')
  expect(() => toSetDetail({ ...apiFixture(setResponse), notes: undefined } as never)).toThrow(
    'notes',
  )
  expect(() =>
    toEffect({ ...apiFixture(rampartResponse).effects[0], notes: undefined } as never, 0),
  ).toThrow('notes')
})

it('rejects malformed note fields with the owner path and note index', () => {
  const item = apiFixture(smallbladeResponse)
  for (const [field, invalid] of Object.entries({
    kind: 'unknown',
    field: 4,
    qualifier: false,
    text: null,
    intended: undefined,
    assumed: undefined,
    in_game: 'yes',
    recorded: null,
  })) {
    expect(() =>
      toItem({ ...item, notes: [{ ...item.notes[0], [field]: invalid }] } as never),
    ).toThrow(`/v1/items/${item.slug}: notes[0].${field}`)
  }
})

it.each([
  ['mighty', mightyResponse],
  ['strength', strengthResponse],
  ['spellsight', spellsightResponse],
])(
  'maps captured %s alias matches without inferring them from the search',
  async (query, response) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(response)))
    const vocabulary = await fetchEffectVocabulary(query)
    expect(vocabulary.rows.map((row) => row.matchedAlias)).toEqual(
      response.effects.map((row) => row.matched_alias),
    )
  },
)

it('rejects a missing alias-match field', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          ...mightyResponse,
          effects: mightyResponse.effects.map((row) => ({ ...row, matched_alias: undefined })),
        }),
      ),
  )
  await expect(fetchEffectVocabulary('mighty')).rejects.toMatchObject({ kind: 'api-response' })
})
