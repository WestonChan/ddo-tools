import {
  assertApiResponseFields,
  fetchApiPage,
  fetchValidatedApiJson,
  isApiEffectList,
  WHOLE_LIST_PAGE_LIMIT,
  type ApiSetDetail,
  type ApiSetRow,
} from '../../../lib/api'
import { toEffect, type Effect } from './items'

export interface SetTier {
  equippedCount: number
  effects: Effect[]
}

export interface SetDetail {
  id: number
  name: string
  tiers: SetTier[]
  items: Array<{ id: number; name: string; slot: string; minimumLevel: number | null }>
}

export async function fetchSetVocabulary(
  searchQuery = '',
): Promise<{ rows: string[]; total: number }> {
  const rows: string[] = []
  let total = 0
  let offset = 0
  do {
    const page = await fetchApiPage<ApiSetRow, 'sets'>(
      '/v1/sets',
      'sets',
      {
        q: searchQuery.trim() || undefined,
        limit: WHOLE_LIST_PAGE_LIMIT,
        offset,
      },
      {
        isValidPage: (page) => page.rows.length > 0 || page.total <= offset,
        responseErrorMessage: 'Incomplete set vocabulary for /v1/sets',
      },
    )
    rows.push(
      ...page.rows.map((set, index) => {
        assertApiResponseFields(set, '/v1/sets', { name: 'string' }, `sets[${offset + index}].`)
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
  path = `/v1/sets/${apiSet?.id ?? 'unknown'}`,
): SetDetail {
  assertApiResponseFields(apiSet, path, {
    id: 'number',
    name: 'string',
    items: 'array',
    tiers: 'array',
  })
  apiSet.tiers.forEach((tier, index) => {
    assertApiResponseFields(tier, path, { effects: 'array' }, `tiers[${index}].`)
  })
  return {
    id: apiSet.id,
    name: apiSet.name,
    items: apiSet.items.map((item) => ({
      id: item.id,
      name: item.name,
      slot: item.slot,
      minimumLevel: item.minimum_level,
    })),
    tiers: apiSet.tiers.map((tier) => ({
      equippedCount: tier.equipped_count,
      effects: tier.effects.map(toEffect),
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

export async function fetchSet(id: number): Promise<SetDetail> {
  const path = `/v1/sets/${id}`
  const response = await fetchValidatedApiJson<ApiSetDetail>(
    path,
    undefined,
    (value): value is ApiSetDetail => invalidSetField(value) === null,
    (invalidResponse) => `Invalid response for ${path}: ${invalidSetField(invalidResponse)}`,
  )
  return toSetDetail(response, path)
}
