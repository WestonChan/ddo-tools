import {
  apiDetailPath,
  apiResponseDiagnosticPath,
  type Slug,
  assertApiResponseFields,
  fetchValidatedApiJson,
  isApiEffectList,
  type ApiSetDetail,
  type ApiSetRow,
} from '../../../lib/api'
import { fetchFilterOptionPage } from '../filters/filterOptionRequests'
import type { FilterOptionRequest } from '../filters/filterOptionSources'
import { toEffect, type Effect } from './items'
import { toNotes, type Note } from './notes'

export interface SetTier {
  equippedCount: number
  effects: Effect[]
}

export interface SetDetail {
  notes: Note[]
  slug: Slug
  name: string
  tiers: SetTier[]
  items: Array<{ slug: Slug; name: string; slot: string; minimumLevel: number | null }>
}

export const SET_VOCABULARY_REQUEST = {
  path: '/v1/sets',
  parameters: {},
} as const satisfies FilterOptionRequest

export async function fetchSetVocabulary(
  searchQuery = '',
): Promise<{ rows: string[]; total: number }> {
  const rows: string[] = []
  let total: number
  let offset = 0
  do {
    const page = await fetchFilterOptionPage<ApiSetRow, 'sets'>(
      SET_VOCABULARY_REQUEST,
      'sets',
      { q: searchQuery, offset },
      {
        isValidPage: (page) => page.rows.length > 0 || page.total <= offset,
        responseErrorMessage: `Incomplete set vocabulary for ${SET_VOCABULARY_REQUEST.path}`,
      },
    )
    rows.push(
      ...page.rows.map((set, index) => {
        assertApiResponseFields(
          set,
          SET_VOCABULARY_REQUEST.path,
          { name: 'string' },
          `sets[${offset + index}].`,
        )
        return set.name
      }),
    )
    total = page.total
    offset += page.rows.length
  } while (offset < total)
  return { rows, total }
}

export function toSetDetail(
  apiSet: ApiSetDetail,
  path = apiResponseDiagnosticPath('sets', apiSet?.slug),
): SetDetail {
  assertApiResponseFields(apiSet, path, {
    slug: 'string',
    name: 'string',
    items: 'array',
    tiers: 'array',
  })
  apiSet.tiers.forEach((tier, index) => {
    assertApiResponseFields(tier, path, { effects: 'array' }, `tiers[${index}].`)
  })
  return {
    notes: toNotes(apiSet, path),
    slug: apiSet.slug,
    name: apiSet.name,
    items: apiSet.items.map((item) => ({
      slug: item.slug,
      name: item.name,
      slot: item.slot,
      minimumLevel: item.minimum_level,
    })),
    tiers: apiSet.tiers.map((tier, tierIndex) => ({
      equippedCount: tier.equipped_count,
      effects: tier.effects.map((effect, index) =>
        toEffect(effect, index, path, `tiers[${tierIndex}].effects[${index}].`),
      ),
    })),
  }
}

function invalidSetField(response: unknown): string | null {
  if (response === null || typeof response !== 'object' || Array.isArray(response)) return 'body'
  const { tiers } = response as { tiers?: unknown }
  if (!Array.isArray(tiers)) return 'tiers'
  const invalidTierIndex = tiers.findIndex(
    (tier) =>
      tier === null ||
      typeof tier !== 'object' ||
      !isApiEffectList((tier as { effects?: unknown }).effects),
  )
  return invalidTierIndex === -1 ? null : `tiers[${invalidTierIndex}].effects`
}

export async function fetchSet(slug: Slug): Promise<SetDetail> {
  const path = apiDetailPath('sets', slug)
  const response = await fetchValidatedApiJson<ApiSetDetail>(
    path,
    undefined,
    (value): value is ApiSetDetail => invalidSetField(value) === null,
    (invalidResponse) => `Invalid response for ${path}: ${invalidSetField(invalidResponse)}`,
  )
  return toSetDetail(response, path)
}
